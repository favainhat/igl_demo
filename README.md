Warning: It is closer to example code than daily use code.<br>

This repo contains the following:


1. Notification Listener can be used with pyinstalive<br>
   **Caution!!** There is a memory leak and will be deleted from the repo soon.
    1. **In windows,** Ahk script to receive notifications from firefox and automatically run pyinstallive.<br>
Use pyinstallive 3.2.4 and Run notification.ahk with ahk 1.1.<br>


    ```
    AutoHotkeyU64.exe notification.ahk
    ```
    You must set this in pyinstalive.ini
    ```
    download_comments = False
    do_heartbeat = False
    ```
    Unfortunately, Since there is no easy way to intercept a web push,
    The method of detecting browser notifications does not work outside of Windows 10+.<br>

    2. **In Linux,** python script to receive notifications from firefox and automatically run pyinstallive. (Tested on kf5 on debian.)
    ```
    python3 notification_linux.py
    ```
    3. **For Mac,** I don't think it's possible on OSX, currently.


2. An alternative python script of pyinstallive is in alternative folder.


3. A nodejs script that receives mqtt notifications and starts live recording. (**recommend**)<br>
You should edit .env before use.

Use it at your own risk. Also, I don't own a Mac or Linux, so it's not tested.<br>


Known Limitation

1. If you use streamlink, you will miss the beginning. <br>An experimental example of running the python wrapper using instagram_private_api_extensions is in the **/testing** folder. This method may have video quality problems.<br>To fix this, You should edit live.py in side-packages/instagram_private_api_extensions like this.
 From
 ```
                representations = sorted(
                    representations,
                    key=lambda rep: (
                        (int(rep.attrib.get('width', '0')) * int(rep.attrib.get('height', '0'))) or
                        int(rep.attrib.get('bandwidth', '0')) or
                        rep.attrib.get('FBQualityLabel') or
                        int(rep.attrib.get('audioSamplingRate', '0'))),
                    reverse=True)
                representation = representations[0]
                representation_id = representation.attrib.get('id', '')
                
 ```
 to
 ```
                representations = sorted(
                    representations,
                    key=lambda rep: (
                        (int(rep.attrib.get('width', '0')) * int(rep.attrib.get('height', '0'))),
                        int(rep.attrib.get('bandwidth', '0'))
                        or
                        int(rep.attrib.get('audioSamplingRate', '0'))
                        ),
                    reverse=True)
                representation = representations[0]
                representation_id = representation.attrib.get('id', '')
 ```
 simply sort algorithm fault. There may be multiple items of the same resolution with different bandwidths. To get the original quality, it must be live-pst-v.<br>
 Sometimes, live-pst-v may not have the best resolution or bandwidth. So, I am considering two options to get the original resolution.
 ```
                 pst_rep = None;
                for rep_elem in representations:
                    if(rep_elem.attrib.get('id','') == "live-pst-v"):
                        pst_rep =  rep_elem
                if pst_rep is not None:
                    representation = pst_rep
                    representation_id = representation.attrib.get('id', '')
 ```
 or
 ```
                representations = sorted(
                    representations,
                    key=lambda rep: (
                        int(rep.attrib.get('FBMaxBandwidth', '0'))
                        or
                        int(rep.attrib.get('audioSamplingRate', '0'))
                        ),
                    reverse=True)
                representation = representations[0]
                representation_id = representation.attrib.get('id', '')
 ```

2. Sometimes notifications may not arrive.

3. The script for nodejs is example script using instagram_mqtt.
If your internet is disconnected, mtqq will not reconnect and node script just will exit.<br>In other words, you cannot receive notification.<br>
Since upstream is not maintained, there is currently no solution. I'm thinking of a Launcher script that checks if the script is running.