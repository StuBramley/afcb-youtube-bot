import express from 'express';
import dotenv from "dotenv";
import AtpAgent, { AtpSessionData, AtpSessionEvent, RichText } from '@atproto/api';
dotenv.config();

var session: AtpSessionData|null = null;

const YouTubeNotifier = require('youtube-notification');
const Parser = require('rss-parser');
const parser = new Parser();  
const app = express();
const port = process.env.PORT;
const baseUrl = "http://" + process.env.CALLBACK_IP + ":" + port;
const hubCallback = `${baseUrl}/youtube/notifications`;

let channelId = process.env.CHANNEL_ID;

const agent = new AtpAgent({
    service : 'https://bsky.social',
    persistSession: (evt: AtpSessionEvent, sess?: AtpSessionData) => {
        session = sess ?? null;
      }    
})

console.log('Starting YouTube Notifier on url ' + hubCallback);

export const notifier = new YouTubeNotifier({
    hubCallback: hubCallback,
    middleware: true
});

app.use("/youtube/notifications", notifier.listener());

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
})

notifier.subscribe(channelId);

notifier.on('subscribe', (data: string) => {
    console.log('Subscribed');
    console.log(data);
});

notifier.on('notified', (data: any) => {
    console.log('New Video');
    console.log(data);
    processVideo(data);
});

async function processVideo(videoObj: any){
//    const videoObj = JSON.parse(data);
    const videoUrl = videoObj.video.link;
    console.log('Video URL: ' + videoUrl);
    await postToBlueSky(videoUrl, videoObj.published.toISOString());
}

async function postToBlueSky(videoUrl: string, createdAt : string){
    // login or refresh session  
    if (session===null) {
      console.log('Logging in');
      await agent.login({
          identifier: process.env.BLUESKY_USERNAME!,
          password: process.env.BLUESKY_PASSWORD!
      });
    } else {
      console.log('Refreshing session');
      await agent.resumeSession(session);
    }
  
    var postRecord = {
        $type: 'app.bsky.feed.post',
        text: '#afcb ${videoUrl}',
        createdAt: createdAt
    }

    console.log('agent posting ' + videoUrl);
    await agent.post(postRecord)
}
