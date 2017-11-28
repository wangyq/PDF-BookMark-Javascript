//========================================================
// PDF Bookmark export and import with Adobe Acrobat 
// Author: siwind
// Mail:  yinqingwang@gmail.com
// Date:  2017-11-20
// Version: 1.0.2
//--------------------------------------------------------

app.addMenuItem({
	cName : "Bookmark <-- File",
	cParent : "Help", //���ڡ�����(Help)���˵�����
	nPos : 0, //0Ϊ������������������λ��
	cExec : "importBookmark();",
	cEnable : "event.rc= (event.target != null);" //�����ĵ���ʱ(event.target != null)�ſ���
});

app.addMenuItem({
	cName : "Bookmark --> File",
	cParent : "Help", //���ڡ�����(Help)���˵�����
	nPos : 1, //0Ϊ������������������λ��
	cExec : "exportBookmark();",
	cEnable : "event.rc= (event.target != null);" //�����ĵ���ʱ(event.target != null)�ſ���
});

var COMMENT_CHAR="#";   //ע���ַ�
var MAX_BOOKMARK_NAME = 120; //���ǩ����
var NO_PAGE_CHAR = "";  //ҳ��δ����
//�ָ����ŵĳ���
var SEP_CHAR="\t";
var SEP_SPACE="    ";
var SEP_STR_IMP=/\t|    |����/;
var SEP_STR_EXP=/\r|\n|\t|   |����/;
var FULL_SPACE="��";
var CR_NL="\r\n"

function isStrNull(strStr){
	if( strStr == null || strStr == undefined ){return true;}
	return false;
}
function strTrim(strStr){//ȥ��ͷβ�հ��ַ�
	if( !isStrNull(strStr) ) return strStr.replace(/(^(\s|��)*)|((\s|��)*$)/g, "");
	return "";
}
function isStrEmpty(strStr){
	return strTrim(strStr).length == 0;
}
function isInteger(strStr){
	return (/^[-\+]?\d+$/).test(strTrim(String(strStr)));
}
function StrLenWithCJK(str){
    var len=0;
    for(var i=0;i<str.length;i++){var c = str.charCodeAt(i);if ((c >= 0x0001 && c <= 0x007e) || (0xff60<=c && c<=0xff9f)) len++; else len +=2; }
    return len;
}
function splitString(strStr,strReg){
	var arrResult = new Array();
	if( !isStrEmpty(strStr) ){ //�ǿ��ַ���	
		var arr = strStr.split(strReg); //�ָ��ַ���
		for(var i=0;i<arr.length;i++){
			if( isStrEmpty(arr[i]) ) continue;
			arrResult.push(strTrim(arr[i])); //ȥ��ͷβ�հ��ַ�
		}
	}
	return arrResult;
}
function parseInputPage(strStr,strReg){
	var basePage = null;
	if( !isStrEmpty(strStr) ){
		var pp = strStr.split(strReg);
		if( pp.length == 2 ){ //exact
			pp[0] = strTrim(pp[0]); pp[1] = strTrim(pp[1]);
			if( isInteger(pp[0]) && isInteger(pp[1]) ) {
				basePage = Number(pp[1]) - Number(pp[0]); 
			}
		}
	}
	return basePage;
}
function readBasePage(){
	var PageRelative = app.response({
			cQuestion : "������: \n\t(��ǩҳ��,  ʵ�ʵ�ҳ��)(���ŷָ�):",
			cTitle : "ҳ����ʼ����",
			cDefault : "1, 1",
			cLabel : "������:"
		});
	var basePage = parseInputPage(PageRelative,/\,/); //���ŷָ�
	if( isStrNull(basePage) ){
		app.alert("�����ʽ����:  " + PageRelative);
	}
	return basePage;
}

function removeComment(strStr){
	if( isStrEmpty(strStr) ) return strStr;
	var i = strStr.indexOf(COMMENT_CHAR); //��#Ϊע�͵Ŀ�ʼ
	if( i==-1) return strStr;   //not found!
	else return strStr.substring(0,i); //remove Comment 
}
function getLevelFromStr(strStr){
	if( isStrEmpty(strStr) ) return 0;
	var l = 0;
	for(var i=0;i<strStr.length;i++){
		if( strStr.substr(i,1) == SEP_CHAR ) l += 4;
		else if ( strStr.substr(i,1) == " " ) l += 1;
		else if ( strStr.substr(i,1) == FULL_SPACE ) l += 4;
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
		var myRow = removeComment(myArr[i]); //����ע����
		if (isStrEmpty(myRow) ) continue; //���Կ���
		
		var level = getLevelFromStr(myRow);
		myLevel.push(level);
		
		myRow = strTrim(myRow);//ȥ��ͷβ�հ��ַ�
		
		var items = splitString(myRow,SEP_STR_IMP); //��Tab����������4���ո��и��ַ���
		if( items.length >=1) myName.push(items[0]);  //��ǩ������
		if( items.length >=2 ){
			myPage.push(isInteger(items[1])?Number(items[1]):NO_PAGE_CHAR);  //��ǩ��ҳ��
		}else{
			myPage.push(NO_PAGE_CHAR);    //no page found!
		}
	}
}
function openBookmark(bkm,st) { //�۵�/��������ǩ
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
		
		if( cur +1 < myLevel[i] ){ strError += "Space indent incorrect: \t" + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( isStrEmpty(myName[i]) ) {strError += "Name is empty: \t" + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( MAX_BOOKMARK_NAME < myName[i].length ){strError += "Name too long: \t" + myName[i] + SEP_CHAR + myPage[i] + "\n";}
		else if( String(myPage[i]) == NO_PAGE_CHAR ){strError += "PageNum not set: \t" + myName[i] + SEP_CHAR + myPage[i] + "\n";}
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
				bkm.createChild(myName[i],"this.pageNum=" +((String(myPage[i])==NO_PAGE_CHAR)?"":basePage+myPage[i])+ ";",bkm.children==null?0:bkm.children.length);
				return i+1;
			}
			i = createBookmark(bkm.children[bkm.children.length-1],cur+1,i,basePage,myLevel,myName,myPage); //sub 
		} else{//equal
			bkm.createChild(myName[i],"this.pageNum=" +((String(myPage[i])==NO_PAGE_CHAR)?"":basePage+myPage[i])+ ";",bkm.children==null?0:bkm.children.length);
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
		var bnames = splitString(bkm.children[i].name, SEP_STR_EXP); //at least two white space
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
	
	var basePage = readBasePage();
	if( isStrNull(basePage) ) return;
	basePage = 1 - basePage;  //real page index is 0
	
	exportBookmarkLevel(doc,bkm,0,myLevel,myName,myPage);
	
	var str = "";
	var width = 76;
	
	for(var i=0;i<myLevel.length;i++){
		var l = myLevel[i];
		var space = "";
		var slen = l*4 + StrLenWithCJK(myName[i]);
		for(var j=0;j<width-slen;j++) space += " ";
		
		while(l>0){str += SEP_CHAR; l--; } //sub level with \t
		
		str += myName[i] + SEP_SPACE+ space ; //Space�ָ�
		str += (myPage[i]+basePage) + CR_NL;
	}
	
	doc.pageNum = 0; //this.pageNum = 0;  //got to first page
	validateBookmark(myLevel,myName,myPage); //check bookmark error!
	
	return str;
}
//===========================================================
//
function importBookmark() {
	//��ʾ����Ŀ¼
	if (!(this.importDataObject("Bookmark"))) {
		return
	}
	//����Ŀ¼�Ƿ�TXT�ı���ʽ
	var MyData = this.getDataObject("Bookmark");
	if (MyData["MIMEType"] != "text/plain") {
		app.alert("������ΪTXT(UTF-8)��ʽ��");
		this.removeDataObject("Bookmark");
		return
	}
	
	var MyStream = this.getDataObjectContents("Bookmark");
	var MyString = util.stringFromStream(MyStream, "utf-8");
	var myArr = MyString.split("\n"); //����Tab������������
	
	var myLevel = new Array();
	var myName = new Array();
	var myPage = new Array();
	
	parseBookmarkArray(myArr,myLevel,myName,myPage); //parseBookmarkArray
	this.removeDataObject("Bookmark");  //����ڴ�

	var basePage = readBasePage();
	if( isStrNull(basePage) ) return;
	basePage -= 1;  //real page index is 0
	
	validateBookmark(myLevel,myName,myPage); //check bookmark error!
	
	this.bookmarkRoot.remove();
	createBookmark(this.bookmarkRoot,0,0,basePage,myLevel,myName,myPage);
	
	openBookmark(this.bookmarkRoot,false);
	//app.execMenuItem("Save"); //save file, not working due to security restrictions.
	//this.saveAs(this.path); //
	app.alert("����ɹ�!\n���ֶ�����PDF�ļ�!");
}
//---------------------------------
//
function exportBookmark(){
	var strComment = "#==================================================\r\n" + 
		"# 0) ÿ�и�ʽ: [����ո������Tab��(��ѡ)] [��ǩ����] [���Tab�����߿ո��] [ҳ��] \r\n" +
		"# 1) ��#��ͷ�Ĳ���Ϊע��, �����Զ����� \r\n" + 
		"# 2) ��ǩ�ļ�������UTF-8��ʽ���� \r\n" + 
		"# 3) ��ǩ��������Tab����������4���ո����������ȫ�ǿո���, ÿ��Tab������ÿ4���ո����1������ȫ�ǿո�����һ��, �������� \r\n" + 
		"# 4) ��ǩ�����Ʋ��ֲ��ܺ���Tab��(Tab��Ϊ�ָ���)��������3���ո��������2��ȫ�ǿո����� \r\n" + 
		"# 5) ��ǩ�����Ʋ��ֺ�ҳ�벿�ֵķָ�����������һ��Tab����������4���ո��������2��ȫ�ǿո�������Ϊ�ָ���� \r\n\r\n" + 
		"# ע: ����ʹ���ı��༭������ѡģʽ���ȿ���1��Tab����������4�ո�Ȼ����ѡģʽͬʱѡ�����ճ������ " + 
		"\r\n";
	
	var strFile = "# Export File: " + this.path + "\r\n";
	var strCur = "# Time: " + util.printd("yyyy/mm/dd HH:MM:ss",new Date()) + "\r\n\r\n";
	
	var str = exportBookmarkString(this,this.bookmarkRoot);
	
	var strOut = strComment + strFile + strCur + str ;
	this.createDataObject("Bookmark.txt", "");
	var oFile = util.streamFromString( strOut , "utf-8");
	this.setDataObjectContents("Bookmark.txt", oFile);
	this.exportDataObject("Bookmark.txt");
	this.removeDataObject("Bookmark.txt");
	
	app.alert("�����ɹ�!");
}
