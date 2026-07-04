# Steam Library PCGamingWiki DRM Checker

Developed and tested on Firefox and Greasemonkey. I have no idea how well it will run with other browsers and similar extensions (e.g. Tampermonkey)!

When loaded for the first time, it will slowly pull in the info, please be patient, as PCGamingWiki API imposes a 30 requests per minute rate limit. You can change the rate by adjusting the REQUEST\_DELAY variable in the script. Be warned, if your IP get rate limited, the script will not gracefully handle it! Note: to pull the info for ALL games, please scroll to the bottom of the page.

All the pulled info is stored in the Local Storage cache, which means it won't be requested each time you open/refresh the page afterwards. If something went wrong and you want to purge it - open Inspect, go to Storage tab, click on Local Storage, choose [https://steamcommunity.com](https://steamcommunity.com) and delete the _pcgw\_game\_cache_ key (press right click on it and choose _Delete "pcgw\_game\_cache"_).

The DRM info is pulled specifically for the Steam platform. The badge also works as a button. Upon clicking on it, a new tab will open, with the game's page on the PCGamingWiki.

GOG and itch.io are just that, badges. They don't act as buttons to the corresponding platforms. Please open the PCGamingWiki page and navigate to them from there!

Did I shamelessly vibe code the script? Absolutely! Sadly, the lazy approach didn't work for me and eventually had to properly spec it out. After some forth and back, finally arrived at this version!

If you find bugs - please open an [Issue](https://github.com/fliker09/steam-library-pcgamingwiki-user-script/issues) and I will see what I can do. If you want new features - please open a [Pull request](https://github.com/fliker09/steam-library-pcgamingwiki-user-script/pulls)!