const Express = require('express');
const Fs = require('fire-fs');
const Path = require('fire-path');
const PkgName = require('./package.json').name;

const Paths = {
    pathname: `${PkgName}.html`,
    boot: Path.join(__dirname, 'panel', 'boot.js'),
    index: Path.join(__dirname, 'panel', 'index.jade'),
};

const UA = PkgName + '/' + require('./package.json').version;

let router = null;

function getPreviewSize () {
    const CFG_PATH = Editor.isWin32 ? 'unpack://simulator/win32/config' :
                                      'unpack://simulator/mac/Simulator.app/Contents/Resources/config';
    let cfg = Editor.require(CFG_PATH)["init_cfg"];
    return new cc.Size(cfg.width || 1280, cfg.height || 1024);
}

module.exports = {
    load () {
        // execute when package loaded
    },

    unload () {
        // execute when package unloaded
        let window = Editor.Window.find(PkgName);
        if (window) {
            window.close();
        }
        this.unhookPreviewServer();
    },

    _getMainPage (req, res) {
        let hasProjectScript = Fs.existsSync(Path.join(Editor.projectPath, 'library', 'bundle.project.js'));
        res.render(Paths.index, {
            title: 'Preview - ' + Editor.projectInfo.name,
            cocos2d: 'cocos2d-js-for-preview.js',
            hasProjectScript: hasProjectScript,
            tip_sceneIsEmpty: Editor.T('PREVIEW.scene_is_empty'),
            enableDebugger: false
        });
    },

    _getMainScript (req, res, next) {
        let userAgent = req.headers['user-agent'];
        let mine = userAgent.indexOf(PkgName) !== -1;
        if (mine) {
            res.sendFile(Paths.boot);
        }
        else {
            next();
        }
    },

    hookPreviewServer () {
        if (router) {
            return;
        }
        router = Express.Router();
        Editor.PreviewServer.userMiddlewares.push(router);

        router.get('/' + Paths.pathname, this._getMainPage);
        router.get('/app/editor/static/preview-templates/boot.js', this._getMainScript);
    },

    unhookPreviewServer () {
        cc.js.array.remove(Editor.PreviewServer.userMiddlewares, router);
        router = null;
    },

    openWindowRegisteredAsPanel () {
        // open entry panel registered in package.json
        // 这个方法会导致窗口在启动编辑器时就被打开，而此时 PreviewServer 还未初始化，需要延迟加载
        // 另外编辑器的窗口默认 webSecurity 都是 true，所以 editor-framework 会有跨域报错
        Editor.Panel.open(PkgName);
        return Editor.Panel.findWindow(PkgName);
    },

    openWindow () {
        // https://github.com/cocos-creator/fireball/issues/5022
        let size = getPreviewSize();
        let options = {
            title: 'Preview - ' + Editor.projectInfo.name,
            windowType: 'simple',
            useContentSize: true,
            width: size.width,
            height: size.height,
            webPreferences: {
                webSecurity: false  // support custom protocols
            },
            save: false
        };
        let window = new Editor.Window(PkgName, options);
        // init window
        window.openDevTools();
        let webContents = window.nativeWin.webContents;
        let ua = webContents.getUserAgent();
        webContents.setUserAgent(ua + ' ' + UA);
        // window.nativeWin.setMenuBarVisibility(false);
        // window.nativeWin.setContentSize(size.width, size.height);
        return window;
    },

    // register your ipc messages here
    messages: {
        'open' () {
            let window = Editor.Window.find(PkgName);
            if (window) {
                window.show();
                window.focus();
                return;
            }

            this.hookPreviewServer();

            // let window = this.openWindowRegisteredAsPanel();
            window = this.openWindow();

            // load game
            let hostpath = `http://localhost:${Editor.PreviewServer.previewPort}/${Paths.pathname}`;
            window.load(hostpath);

            Editor.Metrics.trackEvent({
                category: 'Packages',
                label: PkgName,
                action: 'Panel Open'
            }, null);
        }
    },
};
