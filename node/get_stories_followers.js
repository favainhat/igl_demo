const { withFbnsAndRealtime, withFbns, withRealtime} = require('instagram_mqtt');
const { GraphQLSubscriptions } = require('instagram_mqtt');
const { IgApiClient } = require('instagram-private-api');
const { SkywalkerSubscriptions } = require('instagram_mqtt');
const { promisify } = require('util');
const { writeFile, readFile, exists, existsSync } = require('fs');

const { exec } = require('child_process');
const { spawn } = require('child_process');
const { execFile  } = require('child_process');

var JSONbig = require('json-bigint')({ storeAsString: true });

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

require('dotenv').config();
const {IG_USERNAME = '', IG_PASSWORD = ''} = process.env;

//const started = [];
(async () => {
    // this extends the IgApiClient with realtime features
    const ig = withFbnsAndRealtime(new IgApiClient(), /* you may pass mixins in here */);

    // now `ig` is a client with a valid session
    //ig.state.generateDevice(IG_USERNAME);

    // this logs the client in
    //await loginToInstagram(ig);

    // this will set the auth and the cookies for instagram
    //await readState(ig);
	
	var ImportState = false;
	try{
		ImportState = await readState(ig);
		console.log("ImportState: " + ImportState);
	}catch(exception) {
		console.log(exception);
	}
	if(!ImportState){
		ig.state.generateDevice(IG_USERNAME);
		await loginToInstagram(ig);
	}
	
	if(!ImportState){
	// the client received auth data
	// the listener has to be added before connecting
		ig.fbns.on('auth', async auth => {
			// logs the auth
			logEvent('auth')(auth);
			//saves the auth
			await saveState(ig);
		});
	}
		var reels = await ig.feed.reelsTray().request();
		console.log(reels)
		var lives = reels.broadcasts;
	
		for (const live of lives) {
		var url = live.dash_abr_playback_url
		var liveId = live.id;
		console.log(url)
		//var media_id_info = live.media_id.split("-");
		//var LIVEID = media_id_info[0]
		//var sourceUserId = media_id_info[1]
		//console.log(media_id_info)

		//var userInfo = ig.user.info(sourceUserId)
		//var username = userInfo.username
		username = live.broadcast_owner.username
		if (existsSync( 'sv_' + liveId + "_" + username + '.mp4')) {
			return;
		}
		var child = spawn("streamlink", ['"' + url, '"', "best", "-o", 'sv_' + liveId + "_" + username + '.mp4'], {

			detached: true,
			shell: true,
			stdio: 'ignore'
		});
		child.unref();
		}
	
	
})();


async function saveState(ig) {
    return writeFileAsync('state.json', await ig.exportState(), { encoding: 'utf8' });
}

async function readState(ig) {
    if (!await existsAsync('state.json'))
        return false;
    await ig.importState(await readFileAsync('state.json', {encoding: 'utf8'}));
		return true;
}

async function loginToInstagram(ig) {
    ig.request.end$.subscribe(() => saveState(ig));
    await ig.account.login(IG_USERNAME, IG_PASSWORD);
}

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function logEvent(name) {
    return (data) => console.log(name, data);
}