import fs, { type ReadStream } from "fs";
import _ from "lodash";
import readline from "readline";
import AdmZip from "adm-zip";
import { Octokit } from "@octokit/core";
import { DefaultArtifactClient } from "@actions/artifact";
import { Report } from "./models/Report.js";
import { Site } from "./models/Site.js";
import { FilteredSite, isFilteredSite } from "./models/FilteredSite.js";
import { DifferenceSite, isDifferenceSite } from "./models/DifferenceSite.js";
import { FilteredReport } from "./models/FilteredReport.js";
import { Alert } from "./models/Alert.js";

function createReadStreamSafe(filename: string): Promise<ReadStream> {
  return new Promise((resolve, reject) => {
    const fileStream = fs.createReadStream(filename);
    fileStream.on("error", reject).on("open", () => {
      resolve(fileStream);
    });
  });
}

const actionHelper = {
  getRunnerID: (body: string): string | null => {
    const results = body.match("RunnerID:\\d+");
    if (results !== null && results.length !== 0) {
      return results[0].split(":")[1];
    }
    return null;
  },

  processLineByLine: async (tsvFile: string) => {
    const plugins = [];
    try {
      const fileStream = await createReadStreamSafe(tsvFile);
      const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity,
      });
      for await (const line of rl) {
        if (!line.startsWith("#")) {
          const tmp = line.split("\t");
          if (
            tmp[0].trim() !== "" &&
            tmp[1].trim().toUpperCase() === "IGNORE"
          ) {
            plugins.push(tmp[0].trim());
          }
        }
      }
    } catch (err) {
      console.error(
        `Error when reading the rules file: ${tsvFile} err: ${(
          err as Error
        ).toString()}`,
      );
    }

    return plugins;
  },

  createMessage: (
    sites: Site[] | FilteredSite[] | DifferenceSite[],
    runnerID: string,
    runnerLink: string,
  ) => {
    const NXT_LINE = "\n";
    const TAB = "\t";
    const BULLET = "-";
    let msg = "";
    const instanceCount = 5;

    sites.forEach((site) => {
      msg =
        msg +
        `${BULLET} Site: [${site["@name"]}](${site["@name"]}) ${NXT_LINE}`;
      if ("alerts" in site) {
        if (site.alerts!.length !== 0) {
          msg = `${msg} ${TAB} **New Alerts** ${NXT_LINE}`;
          site.alerts!.forEach((alert) => {
            msg =
              msg +
              TAB +
              `${BULLET} **${alert.name}** [${alert.pluginid}] total: ${alert.instances.length}:  ${NXT_LINE}`;

            for (let i = 0; i < alert.instances.length; i++) {
              if (i >= instanceCount) {
                msg = msg + TAB + TAB + `${BULLET} .. ${NXT_LINE}`;
                break;
              }
              const instance = alert.instances[i];
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
  },

  generateDifference: (
    newReport: Report | FilteredReport,
    oldReport: Report | FilteredReport,
  ): Site[] => {
    newReport.updated = false;
    const siteClone: Site[] = [];
    newReport.site.forEach((newReportSite) => {
      // Check if the new report site already exists in the previous report
      const previousSite = _.filter(
        oldReport.site,
        (s) => s["@name"] === newReportSite["@name"],
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
          "pluginid",
        );
        let removedAlerts = _.differenceBy(
          previousAlerts,
          currentAlerts!,
          "pluginid",
        );

        let ignoredAlerts: Alert[] = [];
        if (isFilteredSite(newReportSite) && isFilteredSite(previousSite[0])) {
          ignoredAlerts = _.differenceBy(
            newReportSite.ignoredAlerts,
            previousSite[0].ignoredAlerts,
            "pluginid",
          );
        } else if (isFilteredSite(newReportSite)) {
          ignoredAlerts = newReportSite.ignoredAlerts;
        }

        removedAlerts = _.differenceBy(
          removedAlerts,
          ignoredAlerts,
          "pluginid",
        );

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
  },

  readMDFile: async (reportName: string) => {
    let res = "";
    try {
      res = fs.readFileSync(reportName, { encoding: "base64" });
    } catch (err) {
      console.error(
        `Error occurred while reading the markdown file! err: ${(
          err as Error
        ).toString()}`,
      );
    }
    return res;
  },

  checkIfAlertsExists: (jsonReport: Report) => {
    return jsonReport.site.some((s) => {
      return "alerts" in s && s.alerts!.length !== 0;
    });
  },

  filterReport: async (
    jsonReport: Report,
    plugins: string[],
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
            ` and #${removedAlerts.length} alerts have been ignored for the site.`,
        );
      }
    });
    return jsonReport as FilteredReport;
  },

  readPreviousReport: async (
    octokit: InstanceType<typeof Octokit>,
    owner: string,
    repo: string,
    workSpace: string,
    runnerID: string,
    artifactName = "zap_scan",
  ) => {
    let previousReport;
    try {
      const artifactList = await octokit.request(
        "GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts",
        {
          owner: owner,
          repo: repo,
          run_id: runnerID as unknown as number,
        },
      );

      const artifacts = artifactList.data.artifacts;
      let artifactID;
      if (artifacts.length !== 0) {
        artifacts.forEach((a: Record<string, unknown>) => {
          if (a.name === artifactName) {
            artifactID = a.id;
          }
        });
      }

      if (artifactID !== undefined) {
        const download = await octokit.request(
          "GET /repos/{owner}/{repo}/actions/artifacts/{artifact_id}/zip",
          {
            owner: owner,
            repo: repo,
            artifact_id: artifactID,
            archive_format: "zip",
          },
        );

        const zip = new AdmZip(Buffer.from(download.data as ArrayBuffer));
        const zipEntries = zip.getEntries();

        zipEntries.forEach(function (zipEntry) {
          if (zipEntry.entryName === "report_json.json") {
            previousReport = JSON.parse(
              zipEntry.getData().toString("utf8"),
            ) as Report;
          }
        });
      }
    } catch (err) {
      console.error(
        `Error occurred while downloading the artifacts! err: ${(
          err as Error
        ).toString()}`,
      );
    }
    return previousReport;
  },

  uploadArtifacts: async (
    rootDir: string,
    mdReport: string,
    jsonReport: string,
    htmlReport: string,
    artifactName = "zap_scan",
  ) => {
    const artifactClient = new DefaultArtifactClient();
    const files = [
      `${rootDir}/${mdReport}`,
      `${rootDir}/${jsonReport}`,
      `${rootDir}/${htmlReport}`,
    ];
    const rootDirectory = rootDir;
    const options = {};

    await artifactClient.uploadArtifact(
      artifactName,
      files,
      rootDirectory,
      options,
    );
  },
};

export default actionHelper;
