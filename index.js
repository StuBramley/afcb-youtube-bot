"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifier = void 0;
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const api_1 = __importDefault(require("@atproto/api"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
var session = null;
const YouTubeNotifier = require('youtube-notification');
const Parser = require('rss-parser');
const parser = new Parser();
const app = (0, express_1.default)();
const port = process.env.PORT;
const baseUrl = "http://" + process.env.CALLBACK_IP + ":" + port;
const hubCallback = `${baseUrl}/youtube/notifications`;
let channelId = process.env.CHANNEL_ID;
const agent = new api_1.default({
    service: 'https://bsky.social',
    persistSession: (evt, sess) => {
        session = sess !== null && sess !== void 0 ? sess : null;
    }
});
console.log('Starting YouTube Notifier on url ' + hubCallback);
exports.notifier = new YouTubeNotifier({
    hubCallback: hubCallback,
    middleware: true
});
app.use("/youtube/notifications", exports.notifier.listener());
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});
exports.notifier.subscribe(channelId);
exports.notifier.on('subscribe', (data) => {
    console.log('Subscribed');
    console.log(data);
});
exports.notifier.on('notified', (data) => {
    console.log('New Video');
    console.log(data);
    processVideo(data);
});
function processVideo(videoObj) {
    return __awaiter(this, void 0, void 0, function* () {
        // login or refresh session  
        if (session === null) {
            console.log('Logging in');
            yield agent.login({
                identifier: process.env.BLUESKY_USERNAME,
                password: process.env.BLUESKY_PASSWORD
            });
        }
        else {
            console.log('Refreshing session');
            yield agent.resumeSession(session);
        }
        const videoUrl = videoObj.video.link;
        console.log('Video URL: ' + videoUrl);
        const cardobj = yield getCardData(videoUrl);
        yield postToBlueSky(videoObj, cardobj);
    });
}
function getCardData(videoUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        const baseCardyUrl = 'https://cardyb.bsky.app/v1/extract?';
        const cardyUrl = baseCardyUrl + 'url=' + encodeURIComponent(videoUrl);
        const response = yield axios_1.default.get(cardyUrl)
            .catch((error) => {
            console.log(error.message);
        });
        if (response) {
            let cardObj = response.data;
            const buffer = yield downloadImage(cardObj.image);
            console.log('Uploading ... ');
            const { data } = yield agent.uploadBlob(buffer);
            cardObj.thumb = data.blob.original;
            return cardObj;
        }
        ;
    });
}
function downloadImage(url) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield (0, axios_1.default)({
            url,
            method: 'GET',
            responseType: 'arraybuffer'
        }).catch((error) => {
            console.log(error.message);
        });
        if (response) {
            console.log('response received from url ' + url);
            const buffer = Buffer.from(response.data, 'binary');
            return buffer;
        }
    });
}
function postToBlueSky(videoObj, cardobj) {
    return __awaiter(this, void 0, void 0, function* () {
        const videoUrl = videoObj.video.link;
        const createdAt = videoObj.published.toISOString();
        var postRecord = {
            $type: 'app.bsky.feed.post',
            text: `#afcb ${videoUrl}`,
            createdAt: createdAt,
            embed: {}
        };
        var embed = {
            "$type": "app.bsky.embed.external#main",
            'external': {
                "$type": "app.bsky.embed.external#external",
                "uri": videoUrl,
                "title": videoObj.video.title,
                "description": cardobj.description,
                "thumb": cardobj.thumb
            }
        };
        postRecord.embed = embed;
        console.log('agent posting ' + videoUrl);
        yield agent.post(postRecord).catch((error) => {
            console.error(error.message);
        });
    });
}
function testPostVideo() {
    return __awaiter(this, void 0, void 0, function* () {
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
    });
}
if (process.argv[2] == 'test') {
    testPostVideo();
}
