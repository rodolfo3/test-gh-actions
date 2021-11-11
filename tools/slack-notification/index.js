const fetch = require("node-fetch");
const github = require("@actions/github");

const getNeedsResult = () => {
  // returns an object with all results
  // { "job": "result" }
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
  // TODO this is checking only the first one - a good practice could be check it all
  const arg = args[0];
  if (!arg || !arg.startsWith("--json=")) {
    return {};
  }
  return JSON.parse(arg.replace("--json=", ""));
};

const notify = async (slackMessage) => {
  // sends the message to slack
  const slack_webhook_url = process.env.SLACK_NOTIFICATION_WEBHOOK;
  return fetch(slack_webhook_url, {
    method: "POST",
    body: JSON.stringify(slackMessage),
    headers: { "Content-Type": "application/json" },
  });
};

const buildNeededBlocks = () => {
  // build the message with the "needed" results
  // to show on slack
  const needed = getNeedsResult();
  const icons = {
    success: ":white_check_mark:",
    failure: ":boom:",
    cancelled: ":x:",
    skipped: ":kangaroo:",
  };

  return Object.keys(needed).map(
    key => ({
      "type": "context",
      "elements": [
        {
          type: "mrkdwn",
          text: icons[needed[key]]
        },
        {
          type: "mrkdwn",
          text: key,
        },
        {
          type: "mrkdwn",
          text: needed[key],
        },
      ]
    })
  );
};

const buildHeader = () => {
  // build a header, using json args data, with title and text
  // title is a plain text
  // text could use markdown and can use "@" to mention ppl
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
  // build a "footer" data, with commit and links to the repository and action
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
  // generate the full message, with header, dependencies and footer
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

// the "main" function, read args and send the message
(async () => {
  const msg = buildMessage();

  // debug: show the message we are sending to slack
  console.log(JSON.stringify({ msg }, null, 2))

  const result = await notify(msg);

  // debug: show the response from slack
  console.log({
    response: await result.text(),
  });
})();
