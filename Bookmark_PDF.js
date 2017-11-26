//========================================================
// PDF Bookmark export and import with Adobe Acrobat 
// Author: siwind
// Mail:  yinqingwang@gmail.com
// Date:  2017-11-20
// Version: 1.0.2
//--------------------------------------------------------

app.addMenuItem({
	cName : "Bookmark <-- File",
	cParent : "Help", //加在”帮助(Help)“菜单下面
	nPos : 0, //0为尽可能最顶，忽略则最底位置
	cExec : "importBookmark();",
	cEnable : "event.rc= (event.target != null);" //当有文档打开时(event.target != null)才可用
});

app.addMenuItem({
	cName : "Bookmark --> File",
	cParent : "Help", //加在”帮助(Help)“菜单下面
	nPos : 1, //0为尽可能最顶，忽略则最底位置
	cExec : "exportBookmark();",
	cEnable : "event.rc= (event.target != null);" //当有文档打开时(event.target != null)才可用
});

var COMMENT_CHAR="#";   //注释字符
var MAX_BOOKMARK_NAME = 120; //最长书签名称
var NO_PAGE_CHAR = "";  //页码未设置
//分隔符号的常量
var SEP_CHAR="\t";
var SEP_SPACE="    ";
var SEP_STR=/\t|    /;

function isStrNull(strStr){
	if( strStr == null || strStr == undefined ){
		return true;
	}
	return false;
}
function isStrEmpty(strStr){
	if( strStr == null || strStr == undefined || strStr.replace(/(^\s*)|(\s*$)/g, "").length ==0 ){
		return true;
	}
	return false;
}

//------------------------------------
//
//
function splitString(strStr,strReg){
	var arrResult = new Array();
	if( !isStrEmpty(strStr) && !isStrNull(strReg) ){ //非空字符串	
		var arr = strStr.split(strReg); //分隔字符串
		for(var i=0;i<arr.length;i++){
			if( isStrEmpty(arr[i]) ) continue;
			arrResult.push(arr[i].replace(/(^\s*)|(\s*$)/g, "")); //去掉头尾空白字符
		}
	}
	return arrResult;
}
function parseInputPage(strStr,strReg){
	var basePage = null;
	var pp = splitString(strStr,strReg); //分隔字符串
	if( pp.length >=2 ){
		if( !isNaN(Number(pp[0])) && !isNaN(Number(pp[1])) ){
			basePage = Number(pp[1]) - Number(pp[0]) -1 ; //PDF内部的页码从0开始
		}
	}
	return basePage;
}

function readBasePage(){
	var PageRelative = app.response({
			cQuestion : "输入书签页码和实际对应的页数(逗号分隔):",
			cTitle : "页码起始设置",
			cDefault : "1,1",
			cLabel : "输入:"
		});
	var basePage = parseInputPage(PageRelative,/\,/); //逗号分隔
	if( isStrNull(basePage) ){
		app.alert("输入格式错误! " + PageRelative);
	}
	return basePage;
}

function removeComment(strStr){
	if( isStrEmpty(strStr) ) return strStr;
	var i = strStr.indexOf(COMMENT_CHAR); //以#为注释的开始
	if( i==-1) return strStr;   //not found!
	else return strStr.substring(0,i); //remove Comment 
}
function getLevelFromStr(strStr){
	if( isStrEmpty(strStr) ) return 0;
	var l = 0;
	for(var i=0;i<strStr.length;i++){
		if( strStr.substr(i,1) == SEP_CHAR ) l += 4;
		else if ( strStr.substr(i,1) == " " ) l += 1;
		else break;
	}
	var base = SEP_SPACE.length;
	var a = l % base;
	l = (l-a)/base;
	if( a > 0 ) l++;
	return l;
}
//------------------------------------
//
//
function parseBookmarkArray(myArr,myLevel,myName,myPage){
	for (var i in myArr) {
		var myRow = removeComment(myArr[i]); //忽略注释行
		if (isStrEmpty(myRow) ) continue; //忽略空行
		
		var level = getLevelFromStr(myRow);
		myLevel.push(level);
		
		myRow = myRow.replace(/(^\s*)|(\s*$)/g, "");//去掉头尾空白字符
		
		var items = splitString(myRow,SEP_STR); //以Tab键或者连续4个空格切割字符串
		if( items.length >=1) myName.push(items[0]);  //书签的名称
		if( items.length >=2 ){
			myPage.push(isNaN(Number(items[1]))?NO_PAGE_CHAR:Number(items[1]));  //书签的页码
		}else{
			myPage.push(NO_PAGE_CHAR);    //no page found!
		}
	}
}
function openBookmark(bkm,st) { //折叠/打开所有书签
	if( bkm == null ) return;
	if( bkm.children != null ){
		for (var i = 0; i < bkm.children.length; i++) {
			openBookmark(bkm.children[i]);
		}
	}
	bkm.open = st; //open/collapse this node!
}
function validateBookmark(myLevel,myName,myPage){
	var strError = "";
	var maxline = 20, line=0;
	var cur = 0;
	for(var i=0;i<myLevel.length;i++){
		var bFault = true;
		
		if( cur +1 < myLevel[i] ){ strError += "Space indent incorrect: " + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( isStrEmpty(myName[i]) ) {strError += "Name is empty: " + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( MAX_BOOKMARK_NAME < myName[i].length ){strError += "Name too long: " + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( String(myPage[i]) == NO_PAGE_CHAR ){strError += "PageNum not set: " + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else {bFault = false;}
		
		cur = myLevel[i]; //update level
		if( bFault ){
			line++;
			if( line >= maxline ){strError += "......";	break;}
		}
	}
	if( !isStrEmpty(strError) ) app.alert(strError);
}

function createBookmark(bkm,cur,index,basePage,myLevel,myName,myPage){
	var i = index;
	while( i < myLevel.length){ //not end!
		if( cur > myLevel[i] ) break;  //end now!
		else if( cur < myLevel[i] ){ //sub menu
			if( bkm.children == null ){
				//app.alert("Error: no parent node! " + myName[i] + " " + myPage[i]); //Error
				bkm.createChild(myName[i],"this.pageNum=" +((myPage[i]==NO_PAGE_CHAR)?"":basePage+myPage[i])+ ";",bkm.children==null?0:bkm.children.length);
				return i+1;
			}
			i = createBookmark(bkm.children[bkm.children.length-1],cur+1,i,basePage,myLevel,myName,myPage); //sub 
		} else{//equal
			bkm.createChild(myName[i],"this.pageNum=" +((myPage[i]==NO_PAGE_CHAR)?"":basePage+myPage[i])+ ";",bkm.children==null?0:bkm.children.length);
			i++; //next element
		} // end if
	}//end of while
	return i;
}
function exportBookmarkLevel(doc,bkm,cur,myLevel,myName,myPage){
	if( bkm == null ) return;
	if( bkm.children == null ) return;
	for( var i=0;i<bkm.children.length;i++){
		myLevel.push(cur);
		var bnames = splitString(bkm.children[i].name, /\r|\n|  /); //at least two white space
		myName.push(bnames.join(" "));
		bkm.children[i].execute();
		myPage.push(doc.pageNum);
		exportBookmarkLevel(doc,bkm.children[i],cur+1,myLevel,myName,myPage);
	}
}
function exportBookmarkString(doc,bkm){
	var myLevel = new Array();
	var myName = new Array();
	var myPage = new Array();
	
	exportBookmarkLevel(doc,bkm,0,myLevel,myName,myPage);
	
	var str = "";
	var width = 75;
	var basePage = 1;
	for(var i=0;i<myLevel.length;i++){
		var l = myLevel[i];
		var space = "";
		var slen = l*4 + myName[i].length;
		if( width <= slen ) space += "   ";
		else {for(var j=0;j<width-slen;j++) space += " ";}
		
		while(l>0){
			str += SEP_CHAR; // "\t"
			l--;
		}
		str += myName[i] + SEP_CHAR+SEP_CHAR +space ; //Tab键分隔
		str += (myPage[i]+basePage) + "\n";
	}
	
	doc.pageNum = 0; //this.pageNum = 0;  //got to first page
	validateBookmark(myLevel,myName,myPage); //check bookmark error!
	
	return str;
}
//===========================================================
//
function importBookmark() {
	//提示导入目录
	if (!(this.importDataObject("txtBookmark"))) {
		return
	}
	//检验目录是否TXT文本格式
	var MyData = this.getDataObject("txtBookmark");
	if (MyData["MIMEType"] != "text/plain") {
		app.alert("请设置为TXT(UTF-8)格式！");
		this.removeDataObject("txtBookmark");
		return
	}
	
	var MyStream = this.getDataObjectContents("txtBookmark");
	var MyString = util.stringFromStream(MyStream, "utf-8");
	var myArr = MyString.split("\n"); //保留Tab键供后续分析
	
	var myLevel = new Array();
	var myName = new Array();
	var myPage = new Array();
	
	parseBookmarkArray(myArr,myLevel,myName,myPage); //parseBookmarkArray
	this.removeDataObject("txtBookmark");  //清空内存

	var basePage = readBasePage();
	if( isStrNull(basePage) ) return;
	
	validateBookmark(myLevel,myName,myPage); //check bookmark error!
	
	this.bookmarkRoot.remove();
	createBookmark(this.bookmarkRoot,0,0,basePage,myLevel,myName,myPage);
	
	openBookmark(this.bookmarkRoot,false);
	//app.execMenuItem("Save"); //save file, not working due to security restrictions.
	//this.saveAs(this.path); //
	app.alert("导入成功!\n请手动保存PDF文件!");
}
//---------------------------------
//
function exportBookmark(){
	var strComment = "#==================================================\n" + 
		"# 0) 每行格式: [多个空格键或者Tab键(可选)] [书签名称] [多个Tab键或者空格键] [页码] \n" +
		"# 1) 以#开头的部分为注释, 空行自动忽略 \n" + 
		"# 2) 书签文件必须以UTF-8格式编码 \n" + 
		"# 3) 书签的缩进以Tab键或者连续4个空格键标记, 每个Tab键或者每4个空格缩进一级, 依次类推 \n" + 
		"# 4) 书签的名称部分不能含有Tab键(Tab键为分隔符)或者连续4个空格及以上 \n" + 
		"# 5) 书签的名称部分和页码部分的分隔符，以至少一个Tab键或者连续4个空格以上做为分隔标记 \n\n" + 
		"# 注: 可以使用文本编辑器的列选模式，先拷贝1个Tab键或者连续4空格，然后列选模式同时选择多列粘贴即可 " + 
		"\n";
	
	var strFile = "# Export File: " + this.path + "\n";
	var strCur = "# Time: " + util.printd("yyyy/mm/dd HH:MM:ss",new Date()) + "\n\n";
	
	var str = exportBookmarkString(this,this.bookmarkRoot);
	
	var strOut = strComment + strFile + strCur + str ;
	this.createDataObject("Bookmark.txt", "");
	var oFile = util.streamFromString( strOut , "utf-8");
	this.setDataObjectContents("Bookmark.txt", oFile);
	this.exportDataObject("Bookmark.txt");
	this.removeDataObject("Bookmark.txt");
	
	app.alert("导出成功!");
}
