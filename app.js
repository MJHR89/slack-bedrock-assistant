const { App, LogLevel, Assistant } = require('@slack/bolt');
const { config } = require('dotenv');
const { BedrockRuntimeClient, InvokeModelCommand } = require('@aws-sdk/client-bedrock-runtime');

config();

/** AWS Bedrock Setup */
const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const modelId = "anthropic.claude-v2"; // Specify your model ID

/** Initialization */
const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    socketMode: true,
    logLevel: LogLevel.DEBUG,
});

/** Slack Assistant */
const assistant = new Assistant({
    threadStarted: async ({ say }) => {
        await say({ text: 'Hi, how can I help?' });
    },

    userMessage: async ({ message, say, setTitle, setStatus }) => {
        const { text } = message;
    
        try {
            await setTitle(text);
            await setStatus('is typing..');
    
            // Construct the prompt for Bedrock
            const prompt = `\n\nHuman: ${text}\n\nAssistant:`;
    
            const request = {
                prompt: prompt,
                max_tokens_to_sample: 2000
            };
    
            const input = {
                body: JSON.stringify(request),
                contentType: "application/json",
                accept: "application/json",
                modelId: modelId
            };
    
            const command = new InvokeModelCommand(input);
            const response = await client.send(command);
            const completionData = JSON.parse(Buffer.from(response.body).toString('utf8'));
    
            // Extract the completion text
            const completionText = completionData.completion.trim(); // Clean whitespace
    
            // Send response back to the user
            await say({ text: completionText });
        } catch (e) {
            console.error(e);
            await say({ text: 'Sorry, something went wrong!' });
        }
    }    
});

app.assistant(assistant);

/** Start the Bolt App */
(async () => {
    try {
        await app.start();
        console.log('⚡️ Bolt app is running!');
    } catch (error) {
        console.error('Failed to start the app', error);
    }
})();
