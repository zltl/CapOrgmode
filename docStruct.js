class DocNode {
    constructor(type) {
        if (type === undefined) {
            type = "";
        }
        this.type = type;
    }
};

class DocStruct {
    constructor() {
        this.nodes = new Array();
        this.printSolvers = [
            { re: /^H[1-5]$/, handle: this.printH123456 },
            { re: /^BR$/, handle: this.printBR },
            { re: /^A$/, handle: this.printA },
            { re: /^P$/, handle: this.printP },
            { re: /^TBODY$/, handle: this.printTBODY },
            { re: /^TABLE$/, handle: this.printTABLE },
            { re: /^TR$/, handle: this.printTR },
            { re: /^TD$|^TH$/, handle: this.printTDTH },
            { re: /^$/, handle: this.printText },
            { re: /^IMG$/, handle: this.printIMG },
            { re: /^UL$/, handle: this.printUL },
            { re: /^OL$/, handle: this.printOL },
            { re: /^LI$/, handle: this.printLI },
            { re: /^CODE$/, handle: this.printCODE },
            { re: /^PRE$/, handle: this.printPRE }
        ]
        this.parseSolvers = [
            { re: /^H[1-5]$|^P$|^TBODY$|^TR$|^TD$|^TH$/, handle: this.parseNormal },
            { re: /^A$/, handle: this.parseA },
            { re: /^TABLE$/, handle: this.parseTable },
            { re: /^IMG$/, handle: this.parseImg },
            { re: /^UL$|^OL$/, handle: this.parseUlOl },
            { re: /^LI$/, handle: this.parseLi },
            { re: /^CODE$|^PRE$/, handle: this.parseCodePre },
        ]
    }

    push(node) {
        this.nodes.push(node);
    }

    join(other) {
        other.nodes.map(x => this.push(x));
    }

    printText(node) {
        return node.text;
    }

    printH123456(node) {
        let docnum = parseInt(node.type.charAt(1));
        let dots = "";
        for (let i = 0; i < docnum; i++) {
            dots += "*";
        }
        return "\n" + dots + " " + node.include.print();
    }

    printBR(node) {
        return "\n";
    }

    printA(node) {
        return "[[" + node.href + "]" + "[" + node.include.print() + "]]";
    }

    printP(node) {
        return "\n" + node.include.print() + "\n";
    }

    printTABLE(node) {
        let haveTbody = false;
        for (let i = 0; i < node.include.nodes.length; i++) {
            if (node.include.nodes[i].type == "TBODY") {
                haveTbody = true;
                break;
            }
        }
        if (haveTbody) {
            return "\n" + node.include.print() + "\n";
        } else {
            let ns = new DocStruct();
            return "\n" + ns.printTBODY(node) + "\n";
        }
    }

    printTBODY(node) {
        let tb = new Array();
        let maxCol = new Array();
        node.include.nodes.forEach(function (row) {
            let rowStrs = new Array();
            while (maxCol.length < row.include.nodes.length) {
                maxCol.push(0);
            }
            for (let i = 0; i < row.include.nodes.length; i++) {
                let cel = row.include.nodes[i];
                let txt = cel.include.print();
                if (maxCol[i] < txt.length) {
                    maxCol[i] = txt.length;
                }
                rowStrs.push(txt);
            }
            tb.push(rowStrs);
        });

        let str = "\n";
        for (let i = 0; i < tb.length; i++) {
            let row = tb[i];
            for (let j = 0; j < row.length; j++) {
                let cel = row[j];
                while (cel.length < maxCol[j]) {
                    cel += " ";
                }
                str += "| " + cel + " ";
            }
            str += "|\n";
        }

        return str;
    }

    printTR(node) {
        let str = "";
        str += node.include.print();
        str += "|\n";
        return str;
    }

    printTDTH(node) {
        return "| " + node.include.print() + " ";
    }

    printIMG(node) {
        return "[[" + node.src + "]" + "[" + node.alt + "]]";
    }
 
    printUL(node) {
        let str = "";
        for (let i = 0; i < node.include.nodes.length; i++) {
            let li = node.include.nodes[i];
            str += "  - " + node.include.printLI(li) + "\n";
        }
        return str + "\n";
    }

    printOL(node) {
        let str = "";
        for (let i = 0; i < node.include.nodes.length; i++) {
            let li = node.include.nodes[i];
            str += "  " + (i+1) + " " + node.include.printLI(li) + "\n";
        }
        return str + "\n";
    }

    printLI(node) {
        let str = "";
        str += node.include.print().replace(/^[\s]+/g, "");
        return str;
    }

    printCODE(node) {
        return node.text;
    }

    printPRE(node) {
        return "#+BEGIN_SRC\n" + node.text + "#+END_SRC"
    }

    spaceConcat(pre, cur, curNode) {
        let lastSpace = /[\s\r\n\(\{\<\[]+$/.test(pre);
        let firstSPace = /^[\s\r\n\)\}\>\]]+/.test(pre);
        if (/^[.,?/:;"'\-_=+!~@#$%^&*]/.test(cur)) {
            return pre + cur;
        } else if (!lastSpace && !firstSPace && curNode.type != "P" && pre.length != 0) {
            return pre + " " + cur;
        } else {
            return pre + cur;
        }
    }

    print() {
        let src = "";
        for (let i = 0; i < this.nodes.length; i++) {
            let node = this.nodes[i];
            let solved = false;
            for (let j = 0; j < this.printSolvers.length; j++) {
                let solver = this.printSolvers[j];
                if (solver.re.test(node.type)) {
                    src = this.spaceConcat(src, solver.handle(node), node);
                    solved = true;
                    break;
                }
            }
            if (!solved) {
                src = this.spaceConcat(src, node.text, node);
            }
        }
        return src;
    }

    parseChilds(node) {
        console.log("parseChilds");
        let newStruct = new DocStruct();
        for (let i = 0; i < node.childNodes.length; i++) {
            let child = node.childNodes[i];
            newStruct.parseNode(child);
        }
        return newStruct;
    }

    // H[1-5],P,TBODY,TR,TD,TH
    parseNormal(node) {
        console.log("parse normal", node.nodeName);
        let ns = new DocStruct();
        let newNode = new DocNode(node.nodeName);
        newNode.include = ns.parseChilds(node);
        ns.push(newNode);
        return ns;
    }

    parseA(node) {
        console.log("parseA");
        let ns = new DocStruct();
        let newNode = new DocNode("A");
        newNode.href = node.href;
        newNode.include = ns.parseChilds(node);
        ns.push(newNode);
        return ns;
    }

    parseTable(node) {
        console.log("parseTable");
        let ns = new DocStruct();
        let newNode = new DocNode("TABLE");
        newNode.include = ns.parseChilds(node);
        ns.push(newNode);
        return ns;
    }

    parseImg(node) {
        console.log("parseImg", node);
        let ns = new DocStruct();
        let newNode = new DocNode(node.nodeName);
        newNode.src = node.src;
        newNode.alt = node.alt;
        ns.push(newNode);
        /*
        TODO: save images
        */
        return ns;
    }

    parseLi(node) {
        console.log("parseLi", node);
        let ns = new DocStruct();
        let newNode = new DocNode(node.nodeName);
        newNode.include = ns.parseChilds(node);
        ns.push(newNode);
        return ns;
    }

    parseUlOl(node) {
        console.log("parseUlOl", node);
        let ns = new DocStruct();
        let newNode = new DocNode(node.nodeName);
        newNode.include = ns.parseChilds(node);
        ns.push(newNode);
        return ns;
    }

    parseCodePre(node) {
        console.log("parseCodePre", node);
        let ns = new DocStruct();
        let newNode = new DocNode(node.nodeName);
        newNode.text = node.innerText;
        ns.push(newNode);
        return ns;
    }

    parseElement(node) {
        let solved = false;
        for (let i = 0; i < this.parseSolvers.length; i++) {
            if (this.parseSolvers[i].re.test(node.nodeName)) {
                this.join(this.parseSolvers[i].handle(node));
                solved = true;
            }
        }
        if (!solved) {
            for (let i = 0; i < node.childNodes.length; i++) {
                let child = node.childNodes[i];
                this.parseNode(child);
            }
        }
    }

    parseNode(node) {
        switch (node.nodeType) {
            case Node.ELEMENT_NODE:
                console.log(node, "is an element node");
                this.parseElement(node)
                break;
            case Node.TEXT_NODE:
                let text = node.wholeText;
                if (text.length !== 0 && text.trim().length !== 0) {
                    let n = new DocNode();
                    text = text.replace(/^[\s]*[\n\r]+[\s]*/g, "");
                    text = text.replace(/[\s]*[\n\r]+[\s]*$/g, "");
                    n.text = text.replace(/[\s]*[\n\r]+[\s]*/g, " ");
                    this.push(n);
                }
                console.log(node, "is a text node, wholeText");
                break;
            case Node.PROCESSING_INSTRUCTION_NODE:
                console.log(node, "is a processing instruction node");
                break;
            case Node.DOCUMENT_NODE:
                console.log(node, "is a document node");
                break;
            case Node.COMMENT_NODE:
                console.log(node, "is a comment node");
                break;
            case Node.DOCUMENT_TYPE_NODE:
                console.log(node, "is a document type node");
                break;
            case Node.DOCUMENT_FRAGMENT_NODE:
                console.log(node, "is a document fragment node");
                break;
            default:
                console.log(node, "unkown type");
                break;
        }
    }
};