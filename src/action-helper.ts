import fs, { type ReadStream } from "fs";
import _ from "lodash";
import readline from "readline";
import AdmZip from "adm-zip";
import request from "request";
import { create } from "@actions/artifact";
import type { GitHub } from "@actions/github/lib/utils";
import { Report } from "./models/Report";
import { Site } from "./models/Site";
import { FilteredSite, isFilteredSite } from "./models/FilteredSite";
import { DifferenceSite, isDifferenceSite } from "./models/DifferenceSite";
import { FilteredReport } from "./models/FilteredReport";
import { Alert } from "./models/Alert";

function createReadStreamSafe(filename: string): Promise<ReadStream> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filename);
    fileStream.on("error", reject).on("open", () => {
      resolve(fileStream);
    });
  });
}

const getRunnerID = (body: string): string | null => {
  const results = body.match("RunnerID:\\d+");
  if (results !== null && results.length !== 0) {
    return results[0].split(":")[1];
  }
  return null;
};
const processLineByLine = async (tsvFile: string) => {
  const plugins = [];
  try {
    const fileStream = await createReadStreamSafe(tsvFile);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });
    for await (const line of rl) {
      if (line.charAt(0) !== "#") {
        const tmp = line.split("\t");
        if (tmp[0].trim() !== "" && tmp[1].trim().toUpperCase() === "IGNORE") {
          plugins.push(tmp[0].trim());
        }
      }
    }
  } catch (err) {
    console.log(`Error when reading the rules file: ${tsvFile}`);
  }

  return plugins;
};

const descriptionsForRisk = {
  "0": "Informational",
  "1": "Low",
  "2": "Medium",
  "3": "High",
};

const descriptionsForConfidence = {
  "0": "False Positive",
  "1": "Low",
  "2": "Medium",
  "3": "High",
  "4": "Confirmed",
};

export const createMessage = (
  sites: Site[] | FilteredSite[] | DifferenceSite[],
  runnerID: string,
  runnerLink: string
) => {
  const NXT_LINE = "\n";
  const TAB = "\t";
  const BULLET = "-";
  let msg = "";
  const instanceCount = 5;

  sites.forEach((site) => {
    msg =
      msg + `${BULLET} Site: [${site["@name"]}](${site["@name"]}) ${NXT_LINE}`;
    if ("alerts" in site) {
      if (site.alerts!.length !== 0) {
        msg = `${msg} ${TAB} **New Alerts** ${NXT_LINE}`;
        site.alerts!.forEach((alert) => {
          const risk = descriptionsForRisk[alert.riskcode];
          const confidence = descriptionsForConfidence[alert.confidence];
          msg =
            msg +
            TAB +
            `${BULLET} **${risk} risk (Confidence: ${confidence}): ${alert.name}** [[${alert.pluginid}]](https://www.zaproxy.org/docs/alerts/${alert.pluginid}) total: ${alert.instances.length}:  ${NXT_LINE}`;

          for (let i = 0; i < alert["instances"].length; i++) {
            if (i >= instanceCount) {
              msg = msg + TAB + TAB + `${BULLET} .. ${NXT_LINE}`;
              break;
            }
            const instance = alert["instances"][i];
            msg =
              msg +
              TAB +
              TAB +
              `${BULLET} [${instance.uri}](${instance.uri}) ${NXT_LINE}`;
          }
        });
        msg = msg + NXT_LINE;
      }
    }

    if (isDifferenceSite(site)) {
      if (site.removedAlerts.length !== 0) {
        msg = `${msg} ${TAB} **Resolved Alerts** ${NXT_LINE}`;
        site.removedAlerts.forEach((alert) => {
          msg =
            msg +
            TAB +
            `${BULLET} **${alert.name}** [${alert.pluginid}] total: ${alert.instances.length}:  ${NXT_LINE}`;
        });
        msg = msg + NXT_LINE;
      }
    }

    if (isFilteredSite(site)) {
      if (site.ignoredAlerts.length !== 0) {
        msg = `${msg} ${TAB} **Ignored Alerts** ${NXT_LINE}`;
        site.ignoredAlerts.forEach((alert) => {
          msg =
            msg +
            TAB +
            `${BULLET} **${alert.name}** [${alert.pluginid}] total: ${alert.instances.length}:  ${NXT_LINE}`;
        });
        msg = msg + NXT_LINE;
      }
    }

    msg = msg + NXT_LINE;
  });
  if (msg.trim() !== "") {
    msg = msg + NXT_LINE + runnerLink;
    msg = msg + NXT_LINE + runnerID;
  }
  return msg;
};
const generateDifference = (
  newReport: Report | FilteredReport,
  oldReport: Report | FilteredReport
): Site[] => {
  newReport.updated = false;
  const siteClone: Site[] = [];
  newReport.site.forEach((newReportSite) => {
    // Check if the new report site already exists in the previous report
    const previousSite = _.filter(
      oldReport.site,
      (s) => s["@name"] === newReportSite["@name"]
    );
    // If does not exists add it to the array without further processing
    if (previousSite.length === 0) {
      newReport.updated = true;
      siteClone.push(newReportSite);
    } else {
      // deep clone the variable for further processing
      const newSite = _.clone(newReportSite);
      const currentAlerts = newReportSite.alerts;
      const previousAlerts = previousSite[0].alerts;

      const newAlerts = _.differenceBy(
        currentAlerts,
        previousAlerts!,
        "pluginid"
      );
      let removedAlerts = _.differenceBy(
        previousAlerts,
        currentAlerts!,
        "pluginid"
      );

      let ignoredAlerts: Alert[] = [];
      if (isFilteredSite(newReportSite) && isFilteredSite(previousSite[0])) {
        ignoredAlerts = _.differenceBy(
          newReportSite["ignoredAlerts"],
          previousSite[0]["ignoredAlerts"],
          "pluginid"
        );
      } else if (isFilteredSite(newReportSite)) {
        ignoredAlerts = newReportSite["ignoredAlerts"];
      }

      removedAlerts = _.differenceBy(removedAlerts, ignoredAlerts, "pluginid");

      newSite.alerts = newAlerts;
      (newSite as DifferenceSite).removedAlerts = removedAlerts;
      (newSite as DifferenceSite).ignoredAlerts = ignoredAlerts;
      siteClone.push(newSite);

      if (
        newAlerts.length !== 0 ||
        removedAlerts.length !== 0 ||
        ignoredAlerts.length !== 0
      ) {
        newReport.updated = true;
      }
    }
  });
  return siteClone;
};
const readMDFile = async (reportName: string) => {
  let res = "";
  try {
    res = fs.readFileSync(reportName, { encoding: "base64" });
  } catch (err) {
    console.log("error while reading the markdown file!");
  }
  return res;
};
const checkIfAlertsExists = (jsonReport: Report) => {
  return jsonReport.site.some((s) => {
    return "alerts" in s && s.alerts!.length !== 0;
  });
};
const filterReport = async (
  jsonReport: Report,
  plugins: string[]
): Promise<FilteredReport> => {
  jsonReport.site.forEach((s) => {
    if ("alerts" in s && s.alerts!.length !== 0) {
      console.log(`starting to filter the alerts for site: ${s["@name"]}`);
      const newAlerts = s.alerts!.filter(function (e) {
        return !plugins.includes(e.pluginid);
      });
      const removedAlerts = s.alerts!.filter(function (e) {
        return plugins.includes(e.pluginid);
      });
      s.alerts = newAlerts;
      (s as FilteredSite).ignoredAlerts = removedAlerts;

      console.log(
        `#${newAlerts.length} alerts have been identified` +
          ` and #${removedAlerts.length} alerts have been ignored for the site.`
      );
    }
  });
  return jsonReport as FilteredReport;
};
const readPreviousReport = async (
  octokit: InstanceType<typeof GitHub>["rest"],
  owner: string,
  repo: string,
  workSpace: string,
  runnerID: string,
  artifactName = "zap_scan"
) => {
  let previousReport;
  try {
    const artifactList = await octokit.actions.listWorkflowRunArtifacts({
      owner: owner,
      repo: repo,
      run_id: runnerID as unknown as number,
    });

    const artifacts = artifactList.data.artifacts;
    let artifactID;
    if (artifacts.length !== 0) {
      artifacts.forEach((a) => {
        if (a["name"] === artifactName) {
          artifactID = a["id"];
        }
      });
    }

    if (artifactID !== undefined) {
      const download = await octokit.actions.downloadArtifact({
        owner: owner,
        repo: repo,
        artifact_id: artifactID,
        archive_format: "zip",
      });

      await new Promise<void>((resolve) =>
        request(download.url)
          .pipe(fs.createWriteStream(`${workSpace}/${artifactName}.zip`))
          .on("finish", () => {
            resolve();
          })
      );

      const zip = new AdmZip(`${workSpace}/${artifactName}.zip`);
      const zipEntries = zip.getEntries();

      zipEntries.forEach(function (zipEntry) {
        if (zipEntry.entryName === "report_json.json") {
          previousReport = JSON.parse(
            zipEntry.getData().toString("utf8")
          ) as Report;
        }
      });
    }
  } catch (e) {
    console.log(`Error occurred while downloading the artifacts!`);
  }
  return previousReport;
};
const uploadArtifacts = async (
  rootDir: string,
  mdReport: string,
  jsonReport: string,
  htmlReport: string,
  artifactName = "zap_scan"
) => {
  const artifactClient = create();
  const files = [
    `${rootDir}/${mdReport}`,
    `${rootDir}/${jsonReport}`,
    `${rootDir}/${htmlReport}`,
  ];
  const rootDirectory = rootDir;
  const options = {
    continueOnError: true,
  };

  await artifactClient.uploadArtifact(
    artifactName,
    files,
    rootDirectory,
    options
  );
};

const actionHelper = {
  getRunnerID,
  processLineByLine,
  createMessage,
  generateDifference,
  readMDFile,
  checkIfAlertsExists,
  filterReport,
  readPreviousReport,
  uploadArtifacts,
};

export default actionHelper;
