import unittest
import argparse
import os
import json
import sys
import logging
import re
import warnings
import codecs
import subprocess
import sys
import time

from instagram_private_api import (
    Client, ClientError, ClientLoginError, ClientCookieExpiredError,
    __version__,
)

def to_json(python_object):
    if isinstance(python_object, bytes):
        return {'__class__': 'bytes',
                '__value__': codecs.encode(python_object, 'base64').decode()}
    raise TypeError(repr(python_object) + ' is not JSON serializable')


def from_json(json_object):
    if '__class__' in json_object and json_object.get('__class__') == 'bytes':
        return codecs.decode(json_object.get('__value__').encode(), 'base64')
    return json_object

if __name__ == '__main__':

    warnings.simplefilter('ignore', UserWarning)
    logging.basicConfig(format='%(name)s %(message)s', stream=sys.stdout)
    logger = logging.getLogger('instagram_private_api')
    logger.setLevel(logging.WARNING)

    # Example command:
    #   python test_private_api.py -u "xxx" -p "xxx" -settings "saved_auth.json" -save

    parser = argparse.ArgumentParser(description='SomeoneLive.py')
    parser.add_argument('-u', '--username', dest='username', type=str)
    parser.add_argument('-p', '--password', dest='password', type=str)
    parser.add_argument('-d', '--device_id', dest='device_id', type=str)
    parser.add_argument('-uu', '--uuid', dest='uuid', type=str)
    parser.add_argument('-debug', '--debug', dest='debug')
    parser.add_argument('-t', '--target',dest='target', type=str, required=True)

    args = parser.parse_args()
    if args.debug:
        logger.setLevel(logging.DEBUG)

    print('Client version: {0!s}'.format(__version__))

    cached_auth = None
    try:
        with open("userinfo.json") as file_data:
            cached_auth = json.load(file_data, object_hook=from_json)
    except:
        if(not args.username or not args.password):
            print("username or password is not entered")
            sys.exit(99)


    api = None
    if not cached_auth:

        ts_seed = str(int(os.path.getmtime(__file__)))
        if not args.uuid:
            # Example of how to generate a uuid.
            # You can generate a fixed uuid if you use a fixed value seed
            uuid = Client.generate_uuid(
                seed='{pw!s}.{usr!s}.{ts!s}'.format(**{'pw': args.username, 'usr': args.password, 'ts': ts_seed}))
        else:
            uuid = args.uuid

        if not args.device_id:
            # Example of how to generate a device id.
            # You can generate a fixed device id if you use a fixed value seed
            device_id = Client.generate_deviceid(
                seed='{usr!s}.{ts!s}.{pw!s}'.format(**{'pw': args.password, 'usr': args.username, 'ts': ts_seed}))
        else:
            device_id = args.device_id

        # start afresh without existing auth
        try:
            api = Client(
                args.username, args.password,
                auto_patch=True, drop_incompat_keys=False,
                guid=uuid, device_id=device_id
                )

        except ClientLoginError:
            print('Login Error. Please check your username and password.')
            sys.exit(99)

        # stuff that you should cache
        cached_auth = api.settings
        # this auth cache can be re-used for up to 90 days
        with open("userinfo.json", 'w') as outfile:
            json.dump(cached_auth, outfile, default=to_json)

    else:
        try:
            # remove previous app version specific info so that we
            # can test the new sig key whenever there's an update
            for k in ['app_version', 'signature_key', 'key_version', 'ig_capabilities']:
                cached_auth.pop(k, None)
            api = Client(
                args.username, args.password,
                auto_patch=False, drop_incompat_keys=False,
                settings=cached_auth
            )

        except ClientCookieExpiredError:
            print('Cookie Expired. Please Relogin.')
            sys.exit(99)
    username_info = api.username_info(args.target)
    username_infoJson = json.dumps(username_info)
    print(username_infoJson)
    userId = username_info['user']['pk_id']
    print(userId)
    user_feed_info = api.user_feed(userId)
    print(user_feed_info)
    userobj = user_feed_info['user']
    try:
        liveId = userobj['live_broadcast_id']
    except:
        print("it seems there is no live")
        sys.exit(99)
    live = api.broadcast_info(liveId)
    playbackUrl = live['dash_abr_playback_url']
    print(playbackUrl)
    liveId = live['id']
    broadcast_owner = live['broadcast_owner']
    username = broadcast_owner['username']	    
    if not os.path.isfile(username + "_"  + str(liveId) +".mp4"):
        child_arg = "streamlink" " "+ "\""+ playbackUrl +"\"" + " " +"best -o " +username + "_"  + str(liveId) +".mp4"
        subprocess.Popen(child_arg,creationflags=subprocess.CREATE_NEW_CONSOLE)
    #while True:
    #    time.sleep(10)
    time.sleep(5)