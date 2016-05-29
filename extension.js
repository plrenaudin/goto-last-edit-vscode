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
    if (!lastChangeTooRecent && !isOnSameLine) {
        saveChangePosition(e);
    }
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

    if (historyPosition < history.length - 1) {
        history.splice(historyPosition);
    }
    if (history.length >= historyMaxSize) {
        history.splice(0, history.length - historyMaxSize + 1);
    }
    history.push(lastEditLocation);
    historyPosition++;
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
            var currentEditor = vscode.window.activeTextEditor;
            if (currentEditor && currentEditor.document.fileName === lastEditLocation.file) {
                scrollToLocation(currentEditor, lastEditLocation);
            } else {
                vscode.workspace.openTextDocument(lastEditLocation.file)
                    .then(vscode.window.showTextDocument)
                    .then(function (editor) { scrollToLocation(editor, lastEditLocation); });
            }
        } else if (!goingBack && historyPosition === history.length - 1) {
            // the max historyPosition should be history.length
            // so when user goes back it points to the last element and not the one before last
            historyPosition++;
        }
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

