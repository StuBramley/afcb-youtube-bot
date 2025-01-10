import express from 'express';
import dotenv from "dotenv";
import AtpAgent, { AtpSessionData, AtpSessionEvent, RichText } from '@atproto/api';
import axios from 'axios';
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
    const videoUrl = videoObj.video.link;
    console.log('Video URL: ' + videoUrl);
    const cardobj = await getCardData(videoUrl);
    await postToBlueSky(videoObj, cardobj);
}

async function getCardData(videoUrl: string){
    const baseCardyUrl= 'https://cardyb.bsky.app/v1/extract?';
    const cardyUrl = baseCardyUrl + 'url=' + encodeURIComponent(videoUrl);
    const response = await axios.get(cardyUrl)
    .catch((error) => {
        console.log(error.message); 
    });
    if (response) {
        let cardObj = response.data;
        const buffer = await downloadImage(cardObj.image);
        console.log('Uploading ... ');
        const { data } = await agent.uploadBlob(buffer);
        cardObj.thumb = data.blob.original;
        return cardObj;
    };
}

async function downloadImage(url: any){
    const response = await axios({
       url,       
       method: 'GET',
       responseType: 'arraybuffer'
    }).catch((error) => {
      console.log(error.message); 
    });
    if (response) { 
      console.log('response received from url ' + url);
      const buffer = Buffer.from(response.data,'binary');
      return buffer;      
    } 
  }

async function postToBlueSky(videoObj: any, cardobj: any){

    const videoUrl: string = videoObj.video.link;
    const createdAt : string = videoObj.published.toISOString();

    var postRecord: any = {
        $type: 'app.bsky.feed.post',
        text: `#afcb ${videoUrl}`,
        createdAt: createdAt,
        embed: {}
    }

    var embed = {
        "$type": "app.bsky.embed.external#main",
        'external':{
            "$type": "app.bsky.embed.external#external",
            "uri": videoUrl,
            "title": videoObj.video.title,
            "description" : cardobj.description,
            "thumb" : cardobj.thumb
        }
    }
    postRecord.embed = embed;

    console.log('agent posting ' + videoUrl);
    await agent.post(postRecord).catch((error) => {
        console.log(error.message); 
    });
}

async function testPostVideo(){
  processVideo({
    video: {
      id: "Y84K8rzjWTo",
      title: "Brooks bags SUBLIME strike to sink the Toffees | AFC Bournemouth 1-0 Everton",
      link: "https://www.youtube.com/watch?v=Y84K8rzjWTo",
    },
    channel: {
      id: "",
      name: "",
      link: "",
    },
    published: new Date(),
    updated: new Date()
  });
}

if (process.argv[2]=='test'){
    testPostVideo();
}