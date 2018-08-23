
function getHTMLOfSelection() {
    var range;
    if (document.selection && document.selection.createRange) {
        range = document.selection.createRange();
        return range.cloneNode(true);
    } else if (window.getSelection) {
        var selection = window.getSelection();
        if (selection.rangeCount > 0) {
            range = selection.getRangeAt(0);
            var clonedSelection = range.cloneContents();
            var div = document.createElement('div');
            div.appendChild(clonedSelection);
            return div.cloneNode(true);
        } else {
            return '';
        }
    } else {
        return '';
    }
}

function getContent() {
    // get selected content, if failed, get main content of this page
    let article = {};
    let content = getHTMLOfSelection();

    let documentClone = document.cloneNode(true);
    if (!content || !content.innerText || content.innerText.length === 0) {
        // no selected content, use main content of this page
        article = new Readability(documentClone).parse(true);
    } else {
        // use selected content
        article = new Readability(documentClone).parse(false);
        article.content = content;
        article.textContent = content.innerText;
    }

    console.log("article.content=", article.content);

    let docstruct = new DocStruct();
    docstruct.parseNode(article.content);
    console.log("orgdoc=", docstruct);
    console.log(docstruct.print());
    article.docs = docstruct;
    article.source = document.URL;
    return article;
}

function showContent(article) {
    let div = document.createElement('div');
    div.setAttribute("contenteditable", "true");
    div.setAttribute("id", "org-float-editor-block");

    let pre = document.createElement('pre');
    pre.setAttribute("id", "org-float-editor-block-pre")
    let docs = article.docs;
    let heads = "#+TITLE: " + article.title + "\n";
    heads += "#+SOURCE: " + article.source + "\n";
    if (!!article.byline) {
        heads += "\n" + article.byline + "\n";
    }

    pre.innerText = heads + "\n" + docs.print();
    div.appendChild(pre);
    document.body.appendChild(div);
}

let toggleFlag = false;
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    console.log("on message", request);
    if (request.op === "click-to-org") {
        if (!toggleFlag) {
            let ns = getContent();
            showContent(ns);
            sendResponse({ op: "click-to-org:view" });
            toggleFlag = !toggleFlag;
        } else {
            toggleFlag = !toggleFlag;
            document.getElementById("org-float-editor-block").remove();
            sendResponse({op: "finish"});    
        }
    }
});

