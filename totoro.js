/*
* 名称: totoro
* 描述: totoro是一个前端工程化解决方案 名字源于宫崎骏动画片龙猫
* 日期: 2014.12.29
* 编写: 单骑闯天下
*/

var totoro=({
	BUILD:'package.json1',// 工程配置文件
	ROOTDIR:'',// 工程根目录
	FS:null,
	PATH:null,
	PROCESS:null,
	RELEASEARR:[],
	PROCESSARR:[],
	UGLIFYJS:null,
	URL:null,
	HTTP:null,
	manifest:null,
	colors:null,
	STYLUS:null,
	build:null,// 工程配置数据
	manifestConfig:null,
	serverHtml:'',//服务器页面
	v:"1.0.1",
	init:function(process,require){
		this.ROOTDIR=process.argv[2]||__dirname;
		this.HTTP=require('http');
		this.FS=require('fs');
		this.PATH=require('path');
		this.URL=require('url');
		this.colors=require('./colors/safe');
		this.STYLUS=require('stylus');
		this.colors.setTheme({
		  silly:'rainbow',
		  input:'grey',
		  verbose:'cyan',
		  prompt:'grey',
		  info:'green',
		  data:'grey',
		  help:'cyan',
		  warn:'yellow',
		  debug:'blue',
		  error:'red'
		});
		
		this.UGLIFYJS=require('uglify-js');
		this.PROCESS=require("child_process");

		var msg=this.msg(),
				command=this.command(),
				merger=this.merger;
		msg.hello(this.ROOTDIR);
		merger.call(this,this.ROOTDIR);
		process.stdin.resume();
		process.stdin.setEncoding('utf8');
		process.stdin.on('data',function(chunk){
			var cmd=chunk.replace(/\r\n/g,'').replace(/[\r\n]/g,'').replace(/\s+/," ").trim().split(' ');
			if(command[cmd[0]]){
				command[cmd[0]].apply(this,cmd.slice(1));
			}
		});
	},
	msg:function(){
		var _this=this;
		return {
			log:function(msg,type){
				var a=type||0,
						b=['Ok:','Error:','Warning:','Prompt:','Data:'];
				switch(a){
					case 0:(console.log(_this.colors.info(b[a]+msg+"\r\n")));break;
					case 1:(console.log(_this.colors.error(b[a]+msg+"\r\n")));break;
					case 2:(console.log(_this.colors.warn(b[a]+msg+"\r\n")));break;
					case 3:(console.log(_this.colors.prompt(b[a]+msg+"\r\n")));break;
					case 4:(console.log(_this.colors.data(b[a]+msg+"\r\n")));break;
					default:break;
				}
			},
			hello:function(dir){
				console.log(_this.colors.info('----------------------------------'));
				console.log(_this.colors.warn('\0\0\0\0\0\0\0\0Welcome to Totoro'));
				console.log(_this.colors.warn('\0\0\0\0\0\0\0\0\0\0\0\0\0v'+_this.v));
				console.log(_this.colors.info('\0\0\0\0\0\0前端工程化集成解决方案'));
				console.log(_this.colors.info('----------------------------------'));
				console.log(_this.colors.info('\r\nTotoro初始化完毕开始工程目录监听:'+dir+'/\r\n'));
			},
			help:function(msg){
				console.log(_this.colors.help(msg+"\r\n"));
			}
		};
	},
	command:function(){
		var _this=this,
				msg=this.msg();
		return {
			reset:function(){
				_this.PROCESSARR.forEach(function(tm){
					clearInterval(tm);
				});
				_this.RELEASEARR=[];
				msg.log('重启中...');
				_this.merger.call(_this,_this.ROOTDIR);
			},
			gcc:function(level){
				level=(level==2)?2:1;
				_this.compiler(level);
			},
			publish:function(){
				_this.publish();
			},
			check:function(){
				_this.check();
			},
			v:function(){
				msg.log(' v '+_this.v);
			},
			server:function(level){
				var port=(level)?level:8888;
				_this.server(port);
			},
			manifest:function(){
				_this.createManifest();
			},
			css:function(level){
				_this.stylus(level);
			},
			help:function(){
				msg.help("---------------------------------------");
				msg.help(" gcc      压缩目标文件");
				msg.help(" reset    重启");
				msg.help(" publish  发布目标文件");
				msg.help(" check    js代码审核");
				msg.help(" server   -port(端口号)\0启动内置调试服务器");
				msg.help(" manifest 执行创建manifest离线配置文件");
				msg.help(" css      执行css文件预编译");
				msg.help(" v        获取版本号");
				msg.help("---------------------------------------");
			}
		};
	},
	/*
 	* 根据指定的目录遍历查找"package.json"，如果查找到，建立map进行变更监听
 	* @param {String} dir 目录地址
 	*/
	merger:function(dir){
		var _this=this,
				buildFile=dir+'/'+this.BUILD,
				fs=_this.FS,
				msg=_this.msg();
		fs.exists(buildFile,function(exists){
			exists?(fs.readFile(buildFile,function(err,data){
				_this.map.call(_this,dir,new Function('return '+data)());
			})):'';
		});
		fs.readdir(dir,function(err,files){
			files&&files.length&&files.forEach(function(item){
				fs.statSync(dir+'/'+item).isDirectory()&&_this.merger.call(_this,dir+'/'+item);
			});
		});
	},
	/*
 	* @class map 根据路径和对应的配置文件，生成监听map
 	* @param {String} dir 路径
 	* @param {Object} build 配置
 	*/
	map:function(dir,build){
		var that=this,
				_this=this,
				msg=this.msg(),
				fs=this.FS,
				path=_this.PATH,
				processArr=_this.PROCESSARR;
		_this.build=build;
		that.manifestConfig=build.manifest;
		var _projects=build.projects,	//工程配置
			_path=dir+'/',				//根路径
			_mainMap={},				//{合并后的文件名:{include:JS文件数组,template:模版文件数组}}
			_fileMap={},				//{合并前的单个文件名:{target:合并后的文件名,time:最后更新时间,type:JS/模版}}
			_tmplMap={};				//{合并后的文件名:模版字符串}
		var getRealPath = function(p){
			return _this.PATH.normalize(/\:|^\//.test(p)?p:_path+'/'+p);
		};
		//获取文件列表
		var getFileList=function(fileList){
			var files=[];
			fileList && fileList.forEach(function(item){
				if(fs.existsSync(getRealPath(item))){
					if(fs.statSync(getRealPath(item)).isDirectory()){
						var items=fs.readdirSync(getRealPath(item));
						items.forEach(function(_item){
							if(/^\..+/.test(_item)){
								return
							}
							files.push(item+'/'+_item);
						});
					}else{
						files.push(item);
					}
				}else{
					msg.log(getRealPath(item)+' does not exist',1);
				}
			});
			return files;
		};
		//当有文件更新时进行合并操作
		var merge=function(file,target,type,mtime){
			var pool=[];
			target.forEach(function(item){
				//用于存储当前唯一文件名，防读写冲突
				//合并JS
				//应F总需求，这里做一个include为空的判断。
				//如果include为空，这把当前target的代码作为合并后的代码，来进行模版匹配
				//新增代码中模版标识为/*TPL.XX.YY*/somecode/**/的模式匹配
				var fileName=getRealPath(item),code;
				if(_mainMap[item].include.length){
					_mainMap[item].include.forEach(function(item){
						if(fs.existsSync(getRealPath(item))){
							pool.push(fs.readFileSync(getRealPath(item)));
						}else{
							msg.log(getRealPath(item)+' does not exist',1);
						}
					});
					codes=pool.join("\r\n");
				}else{
					codes=fs.readFileSync(fileName)+'';
				}
				var tmp={},i=0;
				for(var p in _tmplMap[item]){
					var n = p.replace(/\./g,"\\.");
					var r = new RegExp("\\/\\*<"+n+">\\*\\/(.*?)\\/\\*<\\/"+n+">\\*\\/",'g')
					codes=codes.replace(r,function(match){
						i++;
						tmp[i] = "/*<"+p+">*/'"+_tmplMap[item][p]+"'/*</"+p+">*/";
						return '<@'+i+'@>';
					});
					codes=codes.replace(new RegExp(p.replace(/\./g,"\\."),'g'),function(match){
						i++;
						tmp[i] = "/*<"+p+">*/'"+_tmplMap[item][p]+"'/*</"+p+">*/";
						return '<@'+i+'@>';
					});
					codes=codes.replace(/<@(\d+)@>/g,function(match,i){
						return tmp[i];
					}); 
				}
				fs.writeFileSync(fileName,codes);
				msg.log("文件合并完成："+path.normalize(fileName));
			});
		};
		
		//定时监听_fileMap发现文件更新
		var listen=function(){
			var tm = setInterval(function(){
				for(var p in _fileMap){
					//先检测文件是否存在
					if(fs.existsSync(getRealPath(p))){
						var mtime=+fs.statSync(getRealPath(p)).mtime;
						mtime!=_fileMap[p].time&&function(){
								msg.log('源文件有修改：'+path.normalize(getRealPath(p)),2);
								_fileMap[p].time=mtime;
								merge(p,_fileMap[p].target,_fileMap[p].type,mtime);
						}()
					}else{
						msg.log(getRealPath(p)+' 文件不存在!',1);
					}
				}
			},1000);
			processArr.push(tm);
		};
		//根据工程配置初始化map
		var _init=function(){
			if(_this.PATH.normalize(_path+_this.BUILD)){
				msg.log('发现工程配置文件：'+_this.PATH.normalize(_path+_this.BUILD));
				console.log('工程配置文件:',_projects);
			}
			//遍历工程
			_projects.forEach(function(item){
				_mainMap[item.target]={};
				_mainMap[item.target].include=getFileList(item.include);
				_mainMap[item.target].template=getFileList(item.template);

				//一个文件可能在多个工程中被使用
				_mainMap[item.target].include.forEach(function(_item){
					_fileMap[_item]=_fileMap[_item]||{target:[],time:+_this.FS.statSync(getRealPath(_item)).mtime,type:'js'};
					_fileMap[_item].target.push(item.target);
				});

				_mainMap[item.target].template.forEach(function(_item){
					_fileMap[_item]=_fileMap[_item]||{target:[],time:+_this.FS.statSync(getRealPath(_item)).mtime,type:'tmpl'};
					_fileMap[_item].target.push(item.target);
				});

				_this.RELEASEARR.push({
					compiler:getRealPath(item.compiler || item.target),
					publish:item.publish?getRealPath(item.publish):'',
					src:getRealPath(item.target),
					server:getRealPath(item.server)
				});
			});
			//初始化合并
			for(var p in _mainMap){
				merge(_mainMap[p].include[0],[p],'js',new Date());
			}
			listen();
		};
		_init();
	},
	/*
 	* 压缩选项
 	* @param {Number} level 压缩级别 1-普通压缩，2-深度压缩
 	*/
	compiler:function(level){
		var _this=this,
				path=_this.PATH,
				msg=_this.msg(),
				fs=_this.FS,
				proc=_this.PROCESS,
				releaseArr=_this.RELEASEARR,
				uglifyjs=this.UGLIFYJS;
		var exec=function(sFileName,cFileName,option){
			msg.log("正在压缩文件："+path.normalize(sFileName));
			try{
				var compiler=proc.exec('uglifyjs '+sFileName+option,function(error,stdout,stderr){
					if(error){
						msg.log("文件压缩错误"+error,1);
					}else{
						stdout=_this.method().removeConsole(stdout);
						fs.writeFileSync(cFileName,stdout);
						//已压缩
						msg.log("文件压缩完成："+path.normalize(cFileName));
					}
				});
			}catch(e){
				msg.log("文件压缩错误"+e.message,1);
			}
		};
		var option={1:"--compilation_level WHITESPACE_ONLY",2:' -m'}[level];
		releaseArr.forEach(function(item){
			exec(item.src,item.compiler,option);
		});
	},
	check:function(){
		var _this=this,
				msg=_this.msg(),
				fs=_this.FS,
				proc=_this.PROCESS,
				releaseArr=_this.RELEASEARR;
		var exec=function(sFileName){
			try{
				var compiler=proc.exec('jshint '+sFileName,function(error,stdout){
					if(stdout){
						msg.log("预编译错误!\n\r"+stdout,1);
					}else{
						msg.log("恭喜!预编译成功!");
					}
				});
			}catch(e){
				msg.log("jshint错误或者命令错误!",1);
			}
		};
		releaseArr.forEach(function(item){
			exec(item.src);
		});
	},
	server:function(port){
		var _this=this,
				msg=_this.msg(),
				fs=_this.FS,
				proc=_this.PROCESS,
				http=_this.HTTP,
				url=_this.URL,
				path=_this.PATH,
				fileName=(_this.RELEASEARR[0]).server;
		var exec=function(fileName){
			try{
				http.createServer(function(request,response){
					var pathname=url.parse(request.url).pathname,
							realPath=path.join(pathname),
							index=path.extname(realPath);
					fileName=index?index:fileName;
					if(!_this.serverHtml){
						_this.serverHtml=fileName;
					}
    			fs.exists(_this.serverHtml,function (exists){
		        if(!exists){
		        	response.writeHead(404, {
		            'Content-Type': 'text/plain'
		          });
		          response.write('404:文件不存在!');
		          response.end();
		        }else{
		        	fs.readFile(_this.serverHtml,'utf8',function(err,file){
		            if(err){
		            	response.writeHead(500,{
		            		'Content-Type': 'text/html;charset=utf-8'
		            	});
		            	response.end(err);
		            }else{
		            	var contentType="text/html;charset=utf-8";
		            	response.writeHead(200,{
		            		'Content-Type':contentType
		            	});
		            	response.write(file,"utf8");
		            	response.end();
		            	msg.log('服务器访问中...首页文件路径:'+_this.serverHtml,3);
		            }
		          });
						}
					});
    		}).listen(port);
				msg.log('服务器创建成功,服务器访问地址:127.0.0.1:'+port);
			}catch(e){
				msg.error("服务器创建错误!");
			}
		};
		exec(fileName);
	},
	createManifest:function(){
		var _this=this,
				msg=_this.msg(),
				fs=_this.FS,
				path=_this.PATH;
		var jsonParse=function(jsonStr){
    	return new Function('return ' + jsonStr)();
		};
		var mergeArray=function(origin,list){
			for(var i=0,item;item=list[i];i++){
			  if(origin.indexOf(item)===-1){
			    origin.push(item);
			  }
			}
		};
		var readConfig=function(config){
			var content=fs.readFileSync(config).toString();
		  config=jsonParse(content);
		  return config;
		};
		var pickupJs=function(url){
			var content=fs.readFileSync(url).toString();
			var reg=/<script\s+.*?src="?([^"]+)"?[^>]+>/gi;
			var jss=[];
			content.replace(reg,function(m,u1){
				jss.push(u1);
			});
			return jss;
		};
		var pickupCss=function(url,manifest,config){
			var content=fs.readFileSync(url).toString();
			var maniReg=/(<html.+manifest="?)[^"]*("?[^>]*>)/i;
			if(maniReg.test(content)){
				content=content.replace(maniReg,'$1' + manifest + '$2');
			}else{
				var attr='manifest="' + manifest + '" ';
				content=content.replace(/(<html)([^>]*>)/i,'$1' + attr + '$2');
			}
			var filename=path.join(config.outputRoot,url);
			fs.writeFileSync(filename,content);
			var reg=/<link\s+.*?href="?([^"]+)"?[^>]+>/gi;
			var attReg=/rel="?\bstylesheet\b"?/i;
			var csss=[];
			content.replace(reg,function(m,u1){
				if(attReg.test(m)){
					csss.push(u1);
				}
			});
			return csss;
		};
		var pickupImg=function(url,config){
			url=url.split('?')[0];
			url=config.linkPrefix?url.replace(config.linkPrefix,''):url;
			var content=fs.readFileSync(url).toString();
			var styleRoot=path.join(config.linkPrefix,path.dirname(url));
			var reg=/url\(["']?([^"')]+)["']?\)/gi;
			var imgs=[];
			content.replace(reg,function(m,u1){
				imgs.push(path.join(styleRoot,u1));
			});
			return imgs;
		};
		var writeManifest=function(name,list,config){
			//write cache
			var record=[];
			record.push('CACHE MANIFEST');
			record.push('CACHE:');
			record=record.concat(list);
			//write network
			record.push('NETWORK:');
			record=record.concat(config.network);
			//write fallback
			record.push('FALLBACK:');
			record=record.concat(config.fallback);
			//write timestamp
			record.push('#totoro @' + +new Date);
			var content=record.join('\n');
			var filename=path.join(config.outputRoot,name);
			fs.writeFile(filename,content,function(){
				msg.log('创建manifest文件成功!');
			});
		};
		var main=function(configFile){
			var config=_this.manifestConfig;
			var cacheList=config.cache;
			var htmls,csss,jss,imgs,list,manifest;
			for(var name in cacheList){
				list=[];
				htmls=cacheList[name];
				manifest=name + '.' + config.manifestSuffix;
				for(var i=0,html;html=htmls[i];i++){
					//收集 html
					list.push(html);
					//收集 js
					jss=pickupJs(html);
					mergeArray(list,jss);
					//收集 css
					csss=pickupCss(html,manifest,config);
					mergeArray(list,csss);
					//收集 css 里面的图片
					for(var j=0,css;css=csss[j];j++){
						imgs=pickupImg(css,config);
						mergeArray(list,imgs);
					}
				}
				//创建 manifest 
				writeManifest(manifest,list,config);
			}
		};
		main();
	},
	publish:function(){
		var releaseArr=this.RELEASEARR,
				msg=this.msg(),
				fs=this.FS;
		releaseArr.forEach(function(item){	
			fs.readFile(item.src,function(err,data){
				if(err){
					msg.log("源文件读取失败："+err.message,1);
				}else if(item.publish){
					fs.writeFile(item.publish,data+"",function(err){
						if(err){
							msg.log("文件发布失败："+err.message,1);
						}else{
							msg.log("文件发布成功："+item.publish);
						}
					});
				}
			});
		});
	},
	stylus:function(level){
		var _this=this,file=this.build.projects,fs=this.FS,filePath;
		var arr=[
			{compress:false},{compress:true}
		],obj;
		if(level){
			filePath=fs.readFileSync(level,"utf8");
			_this.cssCompile(filePath,obj,e);
		}else{
			obj=arr[1];
			for(var i=0,l=file.length;i<l;i++){
				obj.src=file[i].cssCompile;
				file[i].cssCompile.forEach(function(e,i){
					filePath=fs.readFileSync(e,"utf8");
					_this.cssCompile(filePath,obj,e);
				});
			}
		}
	},
	cssCompile:function(file,obj,name){
		var stylus=this.STYLUS,
				fs=this.FS,
				msg=this.msg(),
				path=this.PATH,
				suffix=path.extname(name),
				dir=path.dirname(name);
		name=path.basename(name,suffix);
		stylus.render(file,obj,function(error,css){
			if(error){
				msg.log("css编译错误"+error,1);
			}else{
				fs.writeFileSync(dir+'/'+name+'-min.css',css);
				msg.log("css预编译完成");
			}
		});
	},
	method:function(){
		var _this=this,
				uglifyjs=this.UGLIFYJS;
		return {
			removeConsole:function(str){
				var nodeArr=[],
						string=str,
						onde,start_pos,end_pos,replacement,
						ast=uglifyjs.parse(str),
						spliceString=function(str,begin,end,replacement){
    					return str.substr(0,begin)+str.substr(end);
						};
				ast.figure_out_scope();
				ast.walk(new uglifyjs.TreeWalker(function(nodeObj){
					if(nodeObj instanceof uglifyjs.AST_SimpleStatement){
						if(nodeObj.print_to_string({beautify:true}).substr(0,7)=='console'){
				    	nodeArr.push(nodeObj);
				  	}
  				}
				}));
				for(var i=nodeArr.length;--i>=0;){
        	node=nodeArr[i];
        	start_pos=node.start.pos;
        	end_pos=node.end.endpos;
        	replacement=node.print_to_string({beautify:true});
        	string=spliceString(string,start_pos,end_pos,replacement);
    		}
				return string;
			}
		}
	}
}).init(process,require);