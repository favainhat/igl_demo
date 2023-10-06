#!/usr/bin/env python3
#Required: apt install pyhon3-all python3-dbus
import gi.repository.GLib
import dbus
from dbus.mainloop.glib import DBusGMainLoop
import subprocess

#https://specifications.freedesktop.org/notification-spec/notification-spec-latest.html
#org.freedesktop.Notifications.Notify
'''
STRING app_name;
UINT32 replaces_id;
STRING app_icon;
STRING summary;
STRING body;
as actions;
a{sv} hints;
INT32 expire_timeout;
'''

def notifications(bus, message):
    #Without Try catch, Exception is not displayed
    try:
        print(message)
        if message.get_member() == "Notify":
            args = [arg for arg in message.get_args_list()]
            #print(args)
            appname = args[0]
            title = args[3]
            content = args[4]
            print(appname)
            print(title)
            print(content)
            if(title == "Instagram" and "live" in content):
                subprocess.Popen("pyinstalive -df",shell=True)
    except Exception as e:
        print(e)

DBusGMainLoop(set_as_default=True)

bus = dbus.SessionBus()
bus.add_match_string_non_blocking("eavesdrop=true, interface='org.freedesktop.Notifications', member='Notify'")
bus.add_message_filter(notifications)
mainloop = gi.repository.GLib.MainLoop()
mainloop.run()