Warning: It is closer to example code than daily use code.<br>

This repo contains the following:


1. Notification Listener can be used with pyinstalive
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


3. nodejs scripts for better experience. You should edit .env before use.<br>

Use it at your own risk. Also, I don't own a Mac or Linux, so it's not tested.<br>
