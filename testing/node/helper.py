from instagram_private_api_extensions import live
import argparse
import time
import datetime

parser = argparse.ArgumentParser(description='helper.py')
parser.add_argument('-p', '--prefix', dest='prefix', type=str, required=True)
parser.add_argument('-u', '--username', dest='username', type=str, required=True)
parser.add_argument('-l', '--liveid', dest='liveid', type=str, required=True)
parser.add_argument('-m', '--mpd', dest='mpd_url', type=str, required=True)
parser.add_argument('-ts', '--timed', dest='timed', type=str)
args = parser.parse_args()
timestamp = time.time();
output_dir = '{}'.format(args.prefix+ "_" +args.username + "_" +args.liveid)
if args.timed:
    output_dir = output_dir + "_" + str(timestamp) + "/"
else:
    output_dir = output_dir + "/"
dl = live.Downloader(
    mpd=args.mpd_url,
    output_dir=output_dir,
    #user_agent=user_agent,
    )
print(args.username + " live record will start")
try:
    dl.run()
except KeyboardInterrupt:
    if not dl.is_aborted:
        dl.stop()
except Exception as e: 
    print(e)
finally:
    # combine the downloaded files
    # Requires ffmpeg installed. If you prefer to use avconv
    # for example, omit this step and do it manually
    if args.timed:
        dl.stitch(args.prefix+ "_" +args.username + '_' + args.liveid + '_' + str(timestamp) + '.mp4')
    else:
        dl.stitch(args.prefix+ "_" +args.username + '_' + args.liveid + '.mp4')