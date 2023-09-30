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

const { parseArgs } = require('node:util');
const options = {
	t: {
		type: 'string',
	},
};
var args = process.argv;
const { values, positionals } = parseArgs({ strict: false, args, options, allowPositionals: true });
console.log(values)
if(values.t == null){
	console.log("target is no specified Please use with -t=username");
	return;
}

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
	const targetUser = await ig.user.searchExact(values.t); // getting exact user by login
  	const userFeed = ig.feed.user(targetUser.pk);
  	const userFeedinfo = await userFeed.request(); // see "account-followers.feed.example.ts" if you want to know how to work with feeds
  	console.log(userFeedinfo);
  	var liveIdz = userFeedinfo.user.live_broadcast_id;
  	if(liveIdz === undefined){
	  console.log("It seems there is no live")
	  return;
  	}

  	var liveinfoz  = await ig.live.info(liveIdz);
  	console.log(liveinfoz)
  	var urlz = liveinfoz.dash_abr_playback_url
	console.log(urlz)
	if (existsSync( 'uv_' + liveIdz + '.mp4')) {
		return;
	}
	//var userInfo = ig.user.info(sourceUserId)
	//var username = userInfo.username
	//var username = liveinfoz.broadcast_owner.username
	var child = spawn("cmd.exe", ["/c",  "streamlink", '"' + urlz, '"', "best", "-o", 'uv_' +liveIdz+".mp4"], {
		detached: true,
		shell: true,
		stdio: 'ignore'
	});
	child.unref();
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