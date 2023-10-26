const { withFbnsAndRealtime, withFbns, withRealtime } = require('instagram_mqtt');
const { GraphQLSubscriptions } = require('instagram_mqtt');
const { IgApiClient } = require('instagram-private-api');
const { SkywalkerSubscriptions } = require('instagram_mqtt');
const { promisify } = require('util');
const { writeFile, readFile, exists, existsSync } = require('fs');

const { exec } = require('child_process');
const { spawn } = require('child_process');
const { execFile } = require('child_process');

var JSONbig = require('json-bigint')({ storeAsString: true });

const writeFileAsync = promisify(writeFile);
const readFileAsync = promisify(readFile);
const existsAsync = promisify(exists);

require('dotenv').config();
const { IG_USERNAME = '', IG_PASSWORD = '' } = process.env;

const liveList = {};
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
	try {
		ImportState = await readState(ig);
		console.log("ImportState: " + ImportState);
	} catch (exception) {
		console.log(exception);
	}
	if (!ImportState) {
		ig.state.generateDevice(IG_USERNAME);
		await loginToInstagram(ig);
	}

	if (!ImportState) {
	// the client received auth data
	// the listener has to be added before connecting
		ig.fbns.on('auth', async auth => {
			// logs the auth
			logEvent('auth')(auth);
			//saves the auth
			await saveState(ig);
		});
	}
	//fbns
	// you received a notification
	ig.fbns.on('push', logEvent('push'));

	// subscribe subset of push to easy handling record live
	//I don't like rely on it!! but left for a while prevent to possible data loss...
	//ig.fbns.on('live_broadcast', live_event('live_broadcast', ig));
	//ig.fbns.on('live_with_broadcast', live_event('live_with_broadcast'));

	// 'error' is emitted whenever the client experiences a fatal error
	ig.fbns.on('error', logEvent('error'));
	// 'warning' is emitted whenever the client errors but the connection isn't affected
	ig.fbns.on('warning', logEvent('warning'));
	ig.fbns.on('close', () => console.error('RealtimeClient closed'));

	// this sends the connect packet to the server and starts the connection
	// the promise will resolve once the client is fully connected (once /push/register/ is received)
	await ig.fbns.connect();

	//realTime
	// whenever something gets sent and has no event, this is called
	//ig.realtime.on('receive', (topic, messages) => console.log('receive', topic, messages));
	ig.realtime.on('receive', (topic, messages) => unhandled_event('receive', topic, messages, ig));

	// this is called with a wrapper use {message} to only get the "actual" message from the wrapper
	ig.realtime.on('message', logEvent('messageWrapper'));

	// a thread is updated, e.g. admins/members added/removed
	ig.realtime.on('threadUpdate', logEvent('threadUpdateWrapper'));

	// other direct messages - no messages
	ig.realtime.on('direct', logEvent('direct'));

	// whenever something gets sent to /ig_realtime_sub and has no event, this is called
	ig.realtime.on('realtimeSub', logEvent('realtimeSub'));

	// whenever the client has a fatal error
	ig.realtime.on('error', logEvent('error'));
	// 'warning' is emitted whenever the client errors but the connection isn't affected
	ig.realtime.on('warning', logEvent('warning'));
	ig.realtime.on('close', () => console.error('RealtimeClient closed'));

	// connect
	// this will resolve once all initial subscriptions have been sent
	await ig.realtime.connect({
		// optional
		graphQlSubs: [
			// these are some subscriptions
			GraphQLSubscriptions.getAppPresenceSubscription(),
			GraphQLSubscriptions.getZeroProvisionSubscription(ig.state.phoneId),
			GraphQLSubscriptions.getDirectStatusSubscription(),
			GraphQLSubscriptions.getDirectTypingSubscription(ig.state.cookieUserId),
			GraphQLSubscriptions.getAsyncAdSubscription(ig.state.cookieUserId),
		],
		// optional
		skywalkerSubs: [
			SkywalkerSubscriptions.directSub(ig.state.cookieUserId),
			SkywalkerSubscriptions.liveSub(ig.state.cookieUserId),
		],
		// optional
		// this enables you to get direct messages
		irisData: await ig.feed.directInbox().request(),
		// optional
		// in here you can change connect options
		// available are all properties defined in MQTToTConnectionClientInfo
		connectOverrides: {},

		// optional
		// use this proxy
		//socksOptions: {
		//   type: 5,
		//    port: 12345,
		//    host: '...'
		//}
	});

	// simulate turning the device off after 2s and turning it back on after another 2s
	/*
	setTimeout(() => {
		console.log('Device off');
		// from now on, you won't receive any realtime-data as you "aren't in the app"
		// the keepAliveTimeout is somehow a 'constant' by instagram
		ig.realtime.direct.sendForegroundState({
			inForegroundApp: false,
			inForegroundDevice: false,
			keepAliveTimeout: 900,
		});
	}, 2000);
	*/
	///*
	setTimeout(() => {
		console.log('In App');
		ig.realtime.direct.sendForegroundState({
			inForegroundApp: true,
			inForegroundDevice: true,
			keepAliveTimeout: 60,
		});
	}, 2000);
	//*/

	// an example on how to subscribe to live comments
	// you can add other GraphQL subs using .subscribe
	//await ig.realtime.graphQlSubscribe(GraphQLSubscriptions.getLiveRealtimeCommentsSubscription('<broadcast-id>'));


})();

async function saveState(ig) {
	return writeFileAsync('state.json', await ig.exportState(), { encoding: 'utf8' });
}

async function readState(ig) {
	if (!await existsAsync('state.json'))
		return false;
	await ig.importState(await readFileAsync('state.json', { encoding: 'utf8' }));
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

/**
 * A wrapper function to log to the console
 * @param name
 * @returns {(data) => void}
 */
function live_event(name, ig) {
	return (data) => live_record(name, ig, data);
}

async function live_record(name, ig, data) {
	console.log(name, data);
	console.log(data.actionPath)

	//if(data.actionPath.includes('broadcast')){
	console.log(data.actionParams.id);
	var liveId = data.actionParams.id;
	var liveinfo = await ig.live.info(liveId);
	var url = liveinfo.dash_abr_playback_url
	//var userInfo = ig.user.info(data.sourceUserId)
	//var username = userInfo.username
	var username = liveinfo.broadcast_owner.username
	if (existsSync('pv_' +liveId+ "_" +username)) {
		return;
	}
	var child = spawn("helper.py", ["-p" ,"pv","-u",username,"-l", liveId, "-m",'"' + url + '"'], {
		detached: true,
		shell: true,
		stdio: 'ignore'
	});
	child.unref();
	//}
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function child_spawn(username,liveId,url){
	var cfunc = child_spawn.bind(null,username,liveId,url);
	console.log(username + "_" + liveId + " is stared")
	if (liveId in liveList){
		var child = spawn("helper.py", ["-p" ,"rv","-u",username,"-l", liveId, "-m",'"' + url + '"',"-ts","true"], {
			detached: true,
			shell: true,
			stdio: 'ignore'
		});
		console.log(liveList);
		//child.on('exit', cfunc);
		child.on('exit', async function () {
			await sleep(3000); //retry delay
			if (liveId in liveList){
				cfunc();
			}
		});
		return child
	}
}

async function unhandled_event(name, topic, messages, ig) {
	console.log(name, topic, messages);
	for (const message of messages) {
		if (message.data.payload != null) {
			var payload = JSONbig.parse(message.data.payload)
			//console.log(payload);
			if (payload.data != null) {
				var dats = payload.data
				//console.log(dats)
				for (const dat of dats) {
					if (dat.path.includes('broadcast')) {
						if (dat.op == 'add') {
							var foo = dat.value
							var bar = JSONbig.parse(foo);
							var liveId = bar.broadcast_id
							console.log(liveId);
							//if (existsSync(liveId + '.mp4')) {
							//	continue;
							//}
							try {
								var liveinfo = await ig.live.info(liveId);
								//console.log(liveinfo)
								var url = liveinfo.dash_abr_playback_url
								console.log(url)
								//var userInfo = ig.user.info(data.sourceUserId)
								//var username = userInfo.username
								var username = liveinfo.broadcast_owner.username
								if (!(liveId in liveList)){
									var Linfo  = JSON.parse(JSON.stringify(liveinfo));
									liveList[liveId] = Linfo;
									child_spawn(username,liveId,url)
								}
							} catch (exception) {
								console.error(exception);
							}
						}
						if (dat.op == 'remove') {
							var foo = dat.value
							var bar = JSONbig.parse(foo);
							var liveId = bar.broadcast_id
							if (liveId in liveList){
								delete liveList[liveId]
							}

						}
					}
				}
			}
		}
	};

}