const fs = require("fs");
const YAML = require("yaml");
const fetch = require("node-fetch");
const github = require("@actions/github");

const getNeedsResult = () => {
  try {
    const data = JSON.parse(process.env.NEEDS_DATA);
    return Object.keys(data).reduce(
      (acc, i) => ({
        ...acc,
        [i]: data[i].result,
      }),
      {},
    )
  } catch (err) {
    console.error(err)
    return {}
  }
};

const getKeywordArgs = () => {
  // --json='{"prop": "value"}'
  const args = process.argv.slice(2);
  const arg = args[0];
  if (!arg || !arg.startsWith("--json=")) {
    return {};
  }
  return JSON.parse(arg.replace("--json=", ""));
};

const notify = async (slackMessage) => {
  const slack_webhook_url = process.env.SLACK_NOTIFICATION_WEBHOOK;
  return fetch(slack_webhook_url, {
    method: "POST",
    body: JSON.stringify(slackMessage),
    headers: { "Content-Type": "application/json" },
  });
};

const buildNeededBlocks = () => {
  const needed = getNeedsResult();
  const icons = {
    success: ":white_check_mark:",
    failure: ":boom:",
    cancelled: ":x:",
    skipped: ":kangaroo:",
  };
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text:
          Object.keys(needed)
            .map((k) => `${icons[needed[k]] || needed[k]} - ${k}`)
            .join("\n\n") || "N/A",
      },
    },
  ];
};

const buildHeader = () => {
  const kwargs = getKeywordArgs();
  const text = kwargs.text || "GitHub action notification";
  const title = kwargs.title || "GitHub action notification";

  return [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: title,
        emoji: true,
      },
    },
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: text,
      },
    },
  ];
};

const buildFooter = () => {
  const { runNumber, runId, workflow, sha, ref, actor } = github.context;
  const { owner, repo } = github.context.repo;

  const repoUrl = `https://github.com/${owner}/${repo}`;
  const runUrl = `https://github.com/${owner}/${repo}/actions/runs/${runId}`;

  const text = (
    `From the <${repoUrl}|${owner}/${repo} repository> `
    +
    `on the <${runUrl}|run #${runNumber} ${workflow}>`
    +
    '\n\n'
    +
    '```'
    +
    '\n'
    +
    `- sha: ${sha}`
    +
    '\n'
    +
    `- ref: ${ref}`
    +
    '\n'
    +
    `- actor: ${actor}`
    +
    '\n'
    +
    '```'
  );

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text,
      },
    },
  ];
};

const buildMessage = () => {
  const kwargs = getKeywordArgs();
  const text = kwargs.text || "GitHub action notification";

  return {
    text, // this one is showed on the popup notification
    blocks: [
      ...buildHeader(),
      {
        type: "divider",
      },
      ...buildNeededBlocks(),
      {
        type: "divider",
      },
      ...buildFooter(),
    ],
  };
};

(async () => {
  console.log("==DEBUG==");
  console.log(JSON.stringify(github, null, 2));
  console.log("==");

  const result = await notify(buildMessage());
  console.log(await result.text());
})();
