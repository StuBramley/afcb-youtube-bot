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
        //    const videoObj = JSON.parse(data);
        const videoUrl = videoObj.video.link;
        console.log('Video URL: ' + videoUrl);
        yield postToBlueSky(videoUrl, videoObj.published.toISOString());
    });
}
function postToBlueSky(videoUrl, createdAt) {
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
        var postRecord = {
            $type: 'app.bsky.feed.post',
            text: '#afcb ${videoUrl}',
            createdAt: createdAt
        };
        console.log('agent posting ' + videoUrl);
        yield agent.post(postRecord);
    });
}
