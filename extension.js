var vscode = require('vscode');
var history = [];
var historyPosition = 0;
var historyMaxSize = 50;
var lastEditLocation;
var editGroupTimeThreshold = 500;
var lastEditTime;

function _onEvent(e) {
    var lastChangeTooRecent = Date.now() - lastEditTime < editGroupTimeThreshold;
    var documentHasChanged = e.document.isDirty || e.document.isUntitled;
    var isOnSameLine = lastEditLocation && getEventPosition(e).range.end.line === lastEditLocation.position.end.line;
    if (!lastChangeTooRecent && documentHasChanged && !isOnSameLine) {
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

    if (historyPosition < history.length) {
        history.splice(historyPosition, history.length - historyPosition);
    }
    if (history.length >= historyMaxSize) {
        history.splice(0, history.length - historyMaxSize + 1);
    }
    history.push(lastEditLocation);
    return historyPosition++;
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

