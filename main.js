// Modules to control application life and create native browser window
const electron = require('electron')
const process = require('process')
const prompt = require('electron-prompt');
process.on('uncaughtException', function (error) {
    console.error(error);
});

const {app, BrowserWindow, ipcMain, screen, shell, globalShortcut , session, desktopCapturer} = require('electron')
const path = require('path')
const contextMenu = require('electron-context-menu');

var { argv } = require("yargs")
  .scriptName("area")
  .usage("Usage: $0 -w num -h num -w string -p")
  .example(
    "$0 -w 1280 -h 720 -u https://obs.ninja/?view=xxxx",
    "Loads the stream with ID xxxx into a window sized 1280x720"
  )
  .option("w", {
    alias: "width",
    describe: "The width of the window in pixel.",
    type: "number",
    nargs: 1,
  })
  .option("h", {
    alias: "height",
    describe: "The height of the window in pixels.",
    type: "number",
    nargs: 1,
  })
  .option("u", {
    alias: "url",
    describe: "The URL of the window to load.",
    type: "string",
    nargs: 1,
  })
  .option("t", {
    alias: "title",
    describe: "The default Title for the app Window",
    type: "string",
    nargs: 1,
  })
  .option("p", {
    alias: "pin",
    describe: "Toggle always on top",
    type: "boolean"
  })
  .option("a", {
    alias: "hwa",
    describe: "Enable Hardware Acceleration",
    type: "boolean"
  })
  .describe("help", "Show help.") // Override --help usage message.
  .default("h", 1080)
  .default("w", 1920)
  .default("u", "https://Streamcommander.live/electron")
  .default("t", null)
  .default("p", process.platform == 'darwin')
  .default("a", true)
  
const { width, height, url, title, pin, hwa } = argv;

if (!(url.startsWith("http"))){
	url = "https://"+url;
}

if (!(hwa)){
	app.disableHardwareAcceleration();
}

app.commandLine.appendSwitch('enable-features', 'WebAssemblySimd'); // Might not be needed in the future with Chromium; not supported on older Chromium. For faster greenscreen effects.


var counter=0;
var forcingAspectRatio = false;

function createWindow (URL=url) {
 
	let currentTitle = "OBSN";
  
	if (title==null){
		counter+=1;
		currentTitle = "OBSN "+(counter.toString());
	} else if (counter==0){
		counter+=1;
		currentTitle = title;
	} else {
		counter+=1;
		currentTitle = title + " " +(counter.toString());
	}
	
	const ret = globalShortcut.register('CommandOrControl+M', () => {
		console.log('CommandOrControl+N is pressed')
		if (mainWindow) {
			mainWindow.webContents.send('postMessage', {'mic':'toggle'})
		}
	})
	
	ipcMain.on('postMessage', () => {
	    console.log('We received a postMessage from the preload script')
	})

	if (!ret) {
		console.log('registration failed')
	}
	

	let factor = screen.getPrimaryDisplay().scaleFactor;
    
	// Create the browser window.
	const mainWindow = new BrowserWindow({
		width: width / factor,
		height: height / factor,
		frame: false,
		transparent: true,
		backgroundColor: '#141926',
		fullscreenable: true, 
		titleBarStyle: 'customButtonsOnHover',
		icon:'icons/win/icon.ico',
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contextIsolation: false,
			nodeIntegration: true  // this could be a security hazard, but useful for enabling screen sharing and global hotkeys
		},
		title: currentTitle
	});
    
	

	mainWindow.on('close', function(e) { 
        e.preventDefault();
        mainWindow.destroy();
		globalShortcut.unregister('CommandOrControl+M');
		globalShortcut.unregisterAll();
		//app.quit();
	});

	
	
	mainWindow.on("page-title-updated", function(event) {
		event.preventDefault();
	});
	
	mainWindow.webContents.on("did-fail-load", function() {
		app.quit();
	});

	// mainWindow.webContents.setWindowOpenHandler(({ url }) => {
	// 	if (url === 'about:blank') {
	// 	  return {
	// 			overrideBrowserWindowOptions: {
	// 				webPreferences: {
	// 					preload: path.join(__dirname, 'preload.js'),
	// 					contextIsolation: false,
	// 					nodeIntegration: true,
	// 					frame: false,
	// 					fullscreenable: false,
	// 					backgroundColor: '#141926'
	// 				}
	// 			}
	// 		}
	// 	}
	// 	return false
	// })


	if (pin == true) {
		// "floating" + 1 is higher than all regular windows, but still behind things
		// like spotlight or the screen saver
		mainWindow.setAlwaysOnTop(true, "floating", 1);
		// allows the window to show over a fullscreen window
   		mainWindow.setVisibleOnAllWorkspaces(true);
	} else {
		mainWindow.setAlwaysOnTop(false);
		// allows the window to show over a fullscreen window
		mainWindow.setVisibleOnAllWorkspaces(false);
	}

  	try { // MacOS
		app.dock.hide();
  	} catch (e){
		// Windows?
  	}
	

	
	session.fromPartition("default").setPermissionRequestHandler((webContents, permission, callback) => {
        let allowedPermissions = ["audioCapture", "desktopCapture", "pageCapture", "tabCapture", "experimental"]; // Full list here: https://developer.chrome.com/extensions/declare_permissions#manifest

        if (allowedPermissions.includes(permission)) {
            callback(true); // Approve permission request
        } else {
            console.error(
                `The application tried to request permission for '${permission}'. This permission was not whitelisted and has been blocked.`
            );

            callback(false); // Deny
        }
    });
	
	try {
		mainWindow.loadURL(URL);
	} catch (e){
		app.quit();
  	}
	
	
}



// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  app.quit();
})

contextMenu({
		prepend: (defaultActions, params, browserWindow) => [
			{
				label: 'Go to Homepage',
				// Only show it when right-clicking text
				visible: true,
				click: () => {				
					browserWindow.loadURL(`https://Streamcommander.live/electron`);
				}
			},
			{
				label: 'Go Back',
				// Only show it when right-clicking text
				visible: true,
				click: () => {	
					if (browserWindow.webContents.canGoBack()) {				
						browserWindow.webContents.goBack();
					}
				}
			},
			{
				label: 'Reload',
				// Only show it when right-clicking text
				visible: true,
				click: () => {
					
					browserWindow.reload();
				}
			},
			{
				label: 'Open New Window',
				// Only show it when right-clicking text
				visible: true,
				click: () => {
					createWindow("https://Streamcommander.live/electron");
				}
			},
			{
				label: 'Edit URL',
				// Only show it when right-clicking text
				visible: true,
				click: () => {
					var URL = browserWindow.webContents.getURL();
					prompt({
						title: 'Edit the URL',
						label: 'URL:',
						value: URL,
						inputAttrs: {
							type: 'url'
						},
						resizable: true,
						type: 'input'
					})
					.then((r) => {
						if(r === null) {
							console.log('user cancelled');
						} else {
							console.log('result', r);
							browserWindow.loadURL(r);
						}
					})
					.catch(console.error);
				}
			},
			{
				label: 'Resize window',
				// Only show it when right-clicking text
				visible: true,
				type: 'submenu',
				submenu: [
					{
						label: 'Fullscreen',
						// Only show if not already full-screen
						visible: !browserWindow.isMaximized(),
						click: () => {
							browserWindow.isMaximized() ? browserWindow.unmaximize() : browserWindow.maximize();
							browserWindow.setMenu(null);

							//const {width,height} = screen.getPrimaryDisplay().workAreaSize;
							//browserWindow.setSize(width, height);
						}
					},
					{
						label: '1920x1080',
						// Only show it when right-clicking text
						visible: true,
						click: () => {
							if (browserWindow.isMaximized()){browserWindow.unmaximize();}

							//let factor = screen.getPrimaryDisplay().scaleFactor;
							//browserWindow.setSize(1920/factor, 1080/factor);
							let point =  screen.getCursorScreenPoint();
							let factor = screen.getDisplayNearestPoint(point).scaleFactor;
							browserWindow.setSize(1920/factor, 1080/factor);
						}
					},
					{
						label: '1280x720',
						// Only show it when right-clicking text
						visible: true,
						click: () => {
							if (browserWindow.isMaximized()){browserWindow.unmaximize();}
							let point =  screen.getCursorScreenPoint();
							let factor = screen.getDisplayNearestPoint(point).scaleFactor;
							browserWindow.setSize(1280/factor, 720/factor);
						}
					},
					{
						label: '640x360',
						// Only show it when right-clicking text
						visible: true,
						click: () => {
							if (browserWindow.isMaximized()){browserWindow.unmaximize();}
							let point =  screen.getCursorScreenPoint();
							let factor = screen.getDisplayNearestPoint(point).scaleFactor;
							browserWindow.setSize(640/factor, 360/factor);
						}
					},
					{
						label: 'Custom resolution',
						// Only show it when right-clicking text
						visible: true,
						click: () => {
							var URL = browserWindow.webContents.getURL();
							prompt({
								title: 'Custom window resolution',
								label: 'Enter a resolution:',
								value: browserWindow.getSize()[0] + 'x' + browserWindow.getSize()[1],
								inputAttrs: {
									type: 'string',
									placeholder: '1280x720'
								},
								type: 'input'
							})
							.then((r) => {
								if(r === null) {
									console.log('user cancelled');
								} else {
									console.log('Window resized to ', r);
									if (browserWindow.isMaximized()){browserWindow.unmaximize();}
									let point =  screen.getCursorScreenPoint();
									let factor = screen.getDisplayNearestPoint(point).scaleFactor;
									browserWindow.setSize(r.split('x')[0]/factor, r.split('x')[1]/factor);
								}
							})
							.catch(console.error);
						}
					}
				]
			},
			{
				label: 'Always on top',
				type: 'checkbox',
				visible: true,
				checked: browserWindow.isAlwaysOnTop(),
				click: () => {
					if (browserWindow.isAlwaysOnTop()) {
						browserWindow.setAlwaysOnTop(false);
						browserWindow.setVisibleOnAllWorkspaces(false);
					} else {
						browserWindow.setAlwaysOnTop(true, "floating", 1);
						browserWindow.setVisibleOnAllWorkspaces(true);
					}

				}
			},
			{
				label: 'Force 16/9 aspect ratio',
				type: 'checkbox',
				visible: false, // need to re-enable this at some point
				checked: forcingAspectRatio,
				click: () => {
					if (forcingAspectRatio) {
						browserWindow.setAspectRatio(0)
						forcingAspectRatio = false
					} else {
						browserWindow.setAspectRatio(16/9)
						forcingAspectRatio = true
					}
					
				}
			},
			{
				label: 'Close',
				// Only show it when right-clicking text
				visible: true,
				click: () => {
					browserWindow.destroy();
				}
			}
		]
	});

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})



