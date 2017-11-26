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
	if( !isStrEmpty(strStr) && !isStrNull(strReg) ){ //�ǿ��ַ���	
		var arr = strStr.split(strReg); //�ָ��ַ���
		for(var i=0;i<arr.length;i++){
			if( isStrEmpty(arr[i]) ) continue;
			arrResult.push(arr[i].replace(/(^\s*)|(\s*$)/g, "")); //ȥ��ͷβ�հ��ַ�
		}
	}
	return arrResult;
}
function parseInputPage(strStr,strReg){
	var basePage = null;
	var pp = splitString(strStr,strReg); //�ָ��ַ���
	if( pp.length >=2 ){
		if( !isNaN(Number(pp[0])) && !isNaN(Number(pp[1])) ){
			basePage = Number(pp[1]) - Number(pp[0]) -1 ; //PDF�ڲ���ҳ���0��ʼ
		}
	}
	return basePage;
}

function readBasePage(){
	var PageRelative = app.response({
			cQuestion : "������ǩҳ���ʵ�ʶ�Ӧ��ҳ��(���ŷָ�):",
			cTitle : "ҳ����ʼ����",
			cDefault : "1,1",
			cLabel : "����:"
		});
	var basePage = parseInputPage(PageRelative,/\,/); //���ŷָ�
	if( isStrNull(basePage) ){
		app.alert("�����ʽ����! " + PageRelative);
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
		
		myRow = myRow.replace(/(^\s*)|(\s*$)/g, "");//ȥ��ͷβ�հ��ַ�
		
		var items = splitString(myRow,SEP_STR); //��Tab����������4���ո��и��ַ���
		if( items.length >=1) myName.push(items[0]);  //��ǩ������
		if( items.length >=2 ){
			myPage.push(isNaN(Number(items[1]))?NO_PAGE_CHAR:Number(items[1]));  //��ǩ��ҳ��
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
		str += myName[i] + SEP_CHAR+SEP_CHAR +space ; //Tab���ָ�
		str += (myPage[i]+basePage) + "\n";
	}
	
	doc.pageNum = 0; //this.pageNum = 0;  //got to first page
	validateBookmark(myLevel,myName,myPage); //check bookmark error!
	
	return str;
}
//===========================================================
//
function importBookmark() {
	//��ʾ����Ŀ¼
	if (!(this.importDataObject("txtBookmark"))) {
		return
	}
	//����Ŀ¼�Ƿ�TXT�ı���ʽ
	var MyData = this.getDataObject("txtBookmark");
	if (MyData["MIMEType"] != "text/plain") {
		app.alert("������ΪTXT(UTF-8)��ʽ��");
		this.removeDataObject("txtBookmark");
		return
	}
	
	var MyStream = this.getDataObjectContents("txtBookmark");
	var MyString = util.stringFromStream(MyStream, "utf-8");
	var myArr = MyString.split("\n"); //����Tab������������
	
	var myLevel = new Array();
	var myName = new Array();
	var myPage = new Array();
	
	parseBookmarkArray(myArr,myLevel,myName,myPage); //parseBookmarkArray
	this.removeDataObject("txtBookmark");  //����ڴ�

	var basePage = readBasePage();
	if( isStrNull(basePage) ) return;
	
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
	var strComment = "#==================================================\n" + 
		"# 0) ÿ�и�ʽ: [����ո������Tab��(��ѡ)] [��ǩ����] [���Tab�����߿ո��] [ҳ��] \n" +
		"# 1) ��#��ͷ�Ĳ���Ϊע��, �����Զ����� \n" + 
		"# 2) ��ǩ�ļ�������UTF-8��ʽ���� \n" + 
		"# 3) ��ǩ��������Tab����������4���ո�����, ÿ��Tab������ÿ4���ո�����һ��, �������� \n" + 
		"# 4) ��ǩ�����Ʋ��ֲ��ܺ���Tab��(Tab��Ϊ�ָ���)��������4���ո����� \n" + 
		"# 5) ��ǩ�����Ʋ��ֺ�ҳ�벿�ֵķָ�����������һ��Tab����������4���ո�������Ϊ�ָ���� \n\n" + 
		"# ע: ����ʹ���ı��༭������ѡģʽ���ȿ���1��Tab����������4�ո�Ȼ����ѡģʽͬʱѡ�����ճ������ " + 
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
	
	app.alert("�����ɹ�!");
}
