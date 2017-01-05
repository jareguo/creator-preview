const PkgName = require('./package.json').name;
const PreviewName = Editor.lang === 'zh' ? '插件窗口' : 'Preview Plugin';

function load () {
    var playButtons = document.getElementById('playButtons');
    if (playButtons) {
        var added = playButtons.platformList.some(x => x.value === PkgName);
        if (!added) {
            playButtons.platformList = [].concat(playButtons.platformList, {text: PreviewName, value: PkgName});
        }
    }
    else {
        Editor.warn(`${PkgName}: playButtons not initialized`);
    }
}

load();

module.exports = {
    load,
    unload: function () {
        var playButtons = document.getElementById('playButtons');
        if (playButtons) {
            playButtons.platformList = playButtons.platformList.filter(x => x.value !== PkgName);
        }
    }
};
