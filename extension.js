var vscode = require('vscode');
var history = [];
var historyPosition = 0;
var historyMaxSize = 50;
var lastEditLocation;
var editGroupTimeThreshold = 500;
var lastEditTime;

function _onEvent(e) {
    var lastChangeTooRecent = Date.now() - lastEditTime < editGroupTimeThreshold;
    var isOnSameLine = lastEditLocation && getEventPosition(e).range.end.line === lastEditLocation.position.end.line;
    if (!lastChangeTooRecent && !isOnSameLine && isValidEditFile(e)) {
        saveChangePosition(e);
    }
}

function isValidEditFile(e) {
    var isGitRelatedChange = e.document.uri._scheme === "git";
    var isOutpuTabChange = e.document.uri.scheme === "output";
    return !isOutpuTabChange && !isGitRelatedChange;
}

function getEventPosition(event) {
    return event.contentChanges[event.contentChanges.length - 1];
}

function saveChangePosition(event) {
    lastEditLocation = {
        position: getEventPosition(event).range,
        file: event.document.uri.path
    };
    lastEditTime = Date.now();
    if (history.length >= historyMaxSize) {
        var elementsToRemove = history.length - historyMaxSize + 1;
        history.splice(0, elementsToRemove);
    }
    history.push(lastEditLocation);
    historyPosition = history.length;
}

function scrollToLocation(editor, edit) {
    editor.revealRange(edit.position);
    editor.selection = new vscode.Selection(edit.position.start, edit.position.end);
}

function navigate(goingBack) {
    if (history.length > 0) {
        lastEditLocation = goingBack ? history[historyPosition - 1] : history[historyPosition + 1];
        if (lastEditLocation) {
            historyPosition = goingBack ? historyPosition - 1 : historyPosition + 1;
        } else {
            lastEditLocation = goingBack ? history[0] : history[history.length - 1];
        }
        openOrShowLocation(lastEditLocation);
        vscode.window.setStatusBarMessage(`Edit ${historyPosition + 1} of ${history.length}`, 1500);
    }
}

function openOrShowLocation(location) {
    var lastEditEditorFound = vscode.workspace.textDocuments.find(function (item) {
        return item.fileName === location.file;
    });
    if (lastEditEditorFound) {
        vscode.window.showTextDocument(lastEditEditorFound)
            .then(function (editor) { scrollToLocation(editor, location); });
    } else {
        vscode.workspace.openTextDocument(location.file)
            .then(vscode.window.showTextDocument)
            .then(function (editor) { scrollToLocation(editor, location); });
    }
}

module.exports = {
    activate: function (context) {
        var disposable = vscode.workspace.onDidChangeTextDocument(_onEvent);
        var goBack = vscode.commands.registerCommand('extension.goBack', function () { navigate(true); });
        var goForward = vscode.commands.registerCommand('extension.goForward', function () { navigate(false); });

        context.subscriptions.push(disposable, goBack, goForward);
    }
};

