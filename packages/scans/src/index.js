const core = require('@actions/core');
const exec = require('@actions/exec');
const fs = require('fs');
const github = require('@actions/github');
const _ = require('lodash');
const actionHelper = require('./action-helper');
const { DEFAULT_OPTIONS } = require('./constants');

let actionCommon = {
    processReport: (async (token, workSpace, plugins, currentRunnerID, issueTitle, repoName, allowIssueWriting = true, { artifactName } = DEFAULT_OPTIONS) => {
        let jsonReportName = 'report_json.json';
        let mdReportName = 'report_md.md';
        let htmlReportName = 'report_html.html';

        if (!allowIssueWriting) {
            actionHelper.uploadArtifacts(workSpace, mdReportName, jsonReportName, htmlReportName);
            return;
        }

        let openIssue;
        let currentReport;
        let previousRunnerID;
        let previousReport = {};
        let create_new_issue = false;

        // Forward variable declarations
        let octokit;
        let context;
        let owner;
        let repo;

        let tmp = repoName.split('/');
        owner = tmp[0];
        repo = tmp[1];

        octokit = await new github.GitHub(token);
        context = github.context;

        try {
            let jReportFile = fs.readFileSync(`${workSpace}/${jsonReportName}`);
            currentReport = JSON.parse(jReportFile);
        } catch (e) {
            console.log('Failed to locate the json report generated by ZAP Scan!');
            return
        }

        let issues = await octokit.search.issuesAndPullRequests({
            q: encodeURI(`is:issue state:open repo:${owner}/${repo} ${issueTitle}`).replace(/%20/g,'+'),
            sort: 'updated'
        });

        // If there is no existing open issue then create a new issue
        if (issues.data.items.length === 0) {
            create_new_issue = true;
        }else {
            // Sometimes search API returns recently closed issue as an open issue
            for (let i = 0; i < issues.data.items.length; i++) {
                let issue = issues.data.items[i];
                if(issue['state'] === 'open' && issue['user']['login'] === 'github-actions[bot]'){
                    openIssue = issue;
                    break
                }
            }

            if (openIssue === undefined) {
                create_new_issue = true;
            }else {
                console.log(`Ongoing open issue has been identified #${openIssue['number']}`);
                // If there is no comments then read the body
                if (openIssue['comments'] === 0) {
                    previousRunnerID = actionHelper.getRunnerID(openIssue['body']);
                }else {
                    let comments = await octokit.issues.listComments({
                        owner: owner,
                        repo: repo,
                        issue_number: openIssue['number']
                    });

                    let lastBotComment;
                    let lastCommentIndex = comments['data'].length - 1;
                    for (let i = lastCommentIndex; i >= 0; i--) {
                        if (comments['data'][i]['user']['login'] === 'github-actions[bot]') {
                            lastBotComment = comments['data'][i];
                            break;
                        }
                    }

                    if (lastBotComment === undefined) {
                        previousRunnerID = actionHelper.getRunnerID(openIssue['body']);
                    }else {
                        previousRunnerID = actionHelper.getRunnerID(lastBotComment['body']);
                    }
                }

                if (previousRunnerID !== null) {
                    previousReport = await actionHelper.readPreviousReport(octokit, owner, repo, workSpace, previousRunnerID, { artifactName });
                    if (previousReport === undefined) {
                        create_new_issue = true;
                    }
                }
            }
        }

        if (plugins.length !== 0) {
            console.log(`${plugins.length} plugins will be ignored according to the rules configuration`);
            currentReport = await actionHelper.filterReport(currentReport, plugins);

            // Update the newly filtered report
            fs.unlinkSync(`${workSpace}/${jsonReportName}`);
            fs.writeFileSync(`${workSpace}/${jsonReportName}`, JSON.stringify(currentReport));
            console.log('The current report is updated with the ignored alerts!')
        }

        let newAlertExits = actionHelper.checkIfAlertsExists(currentReport);

        console.log(`Alerts present in the current report: ${newAlertExits}`);

        if (!newAlertExits) {
            // If no new alerts have been found close the issue
            console.log('No new alerts have been identified by the ZAP Scan');
            if (openIssue != null && openIssue.state === 'open') {
                // close the issue with a comment
                console.log(`Starting to close the issue #${openIssue.number}`);
                try{
                    await octokit.issues.createComment({
                        owner: owner,
                        repo: repo,
                        issue_number: openIssue.number,
                        body: 'All the alerts have been resolved during the last ZAP Scan!'
                    });
                    await octokit.issues.update({
                        owner: owner,
                        repo: repo,
                        issue_number: openIssue.number,
                        state: 'closed'
                    });
                    console.log(`Successfully closed the issue #${openIssue.number}`);
                }catch (err) {
                    console.log(`Error occurred while closing the issue with a comment! err: ${err}`)
                }
            }else if (openIssue != null && openIssue.state === 'closed') {
                console.log('No alerts found by ZAP Scan and no active issue is found in the repository, exiting the program!');
            }
            return;
        }

        let runnerInfo = `RunnerID:${currentRunnerID}`;
        let runnerLink = `View the [following link](https://github.com/${owner}/${repo}/actions/runs/${currentRunnerID})` +
            ` to download the report.`;
        if (create_new_issue) {

            let msg = actionHelper.createMessage(currentReport['site'], runnerInfo, runnerLink);
            const newIssue = await octokit.issues.create({
                owner: owner,
                repo: repo,
                title: issueTitle,
                body: msg
            });
            console.log(`Process completed successfully and a new issue #${newIssue.data.number} has been created for the ZAP Scan.`);

        } else {

            let siteClone = actionHelper.generateDifference(currentReport, previousReport);
            if (currentReport.updated) {
                console.log('The current report has changes compared to the previous report');
                try{
                    let msg = actionHelper.createMessage(siteClone, runnerInfo, runnerLink);
                    await octokit.issues.createComment({
                        owner: owner,
                        repo: repo,
                        issue_number: openIssue['number'],
                        body: msg
                    });

                    console.log(`The issue #${openIssue.number} has been updated with the latest ZAP scan results!`);
                    console.log('ZAP Scan process completed successfully!');
                }catch (err) {
                    console.log(`Error occurred while updating the issue #${openIssue.number} with the latest ZAP scan: ${err}`)
                }

            } else {
                console.log('No changes have been observed from the previous scan and current scan!, exiting the program!')
            }
        }

        actionHelper.uploadArtifacts(workSpace, mdReportName, jsonReportName, htmlReportName, { artifactName });

    })
};


module.exports = {
    main: actionCommon,
    helper: actionHelper
};
