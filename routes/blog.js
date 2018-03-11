var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var Blog = require('./../model/blog');
var User = require('./../model/user');
var BlogCommentList = require('./../model/blogCommentList');
var BlogCommentReplyList = require('./../model/blogCommentReplyList');
var FavouriteBlogList = require('./../model/favouriteBlogList');
var FavouriteWorkList = require('./../model/favouriteWorkList');
var PraiseBlogList = require('./../model/praiseBlogList');
var PraiseWorkList = require('./../model/praiseWorkList');
var larger = require('./../util/util');


//id为-1以及status为0是草稿保存，没有id以及status为1是发布
router.post('/saveBlog',function(req,res,next){
    var userId = req.body.userId,  //获取当前用户
        _id = req.body.id,
        blogCreateTime = Date.now(),
        blogTitle = req.body.title,
        blogAbstract = req.body.abstract,
        blogContent = req.body.htmlCode,
        blogSource = req.body.mdCode,
        blogTypeName = req.body.tag,
        blogTypeId = req.body.typeId,
        blogStatus = req.body.status;
    //先判断blogId是否存在，如果存在则更新，如果不存在，则保存
    if(_id==-1){
        var blog = new Blog({
            userInfo: userId,
            blogCreateTime:blogCreateTime,
            blogTitle:blogTitle,
            blogAbstract:blogAbstract,
            blogContent:blogContent,
            blogSource:blogSource,
            blogTypeName:blogTypeName,
            blogTypeId:blogTypeId,
            blogStatus:blogStatus,
            blogCommentCount:0,
            blogFavoritesCount:0,
            blogPraiseCount:0,
            blogReadCount:0,
        });    
            blog.save(function(err,doc1){
                if(blogStatus==0){
                    if(err){
                        res.json({
                            result: {
                                status: '3101',
                                message: '草稿未保存成功'
                            }  
                        })
                    }else{
                        res.json({
                            result: {
                                status: '200',
                                message: '草稿保存成功'
                            }, 
                            data: {
                                id: doc1._id
                            }
                        })
                    }
                }else{
                    if(err){
                        res.json({
                            result: {
                                status: '3102',
                                message: '文章未保存成功'
                            }  
                        })
                    }else{
                        res.json({
                            result: {
                                status: '200',
                                message: '文章发布成功'
                            }, 
                            data: {
                                id: doc1._id
                            }
                        })
                    }
                }     
            })
        }     else{
                    Blog.update({
                        _id:_id,
                    },{
                        $set:{                         
                            blogCreateTime:blogCreateTime,
                            blogTitle:blogTitle,
                            blogAbstract:blogAbstract,
                            blogContent:blogContent,
                            blogSource:blogSource,
                            blogTypeName:blogTypeName,
                            blogTypeId:blogTypeId,
                            blogStatus:blogStatus,
                        }                    
                    },function(err2,doc2){  
                        if(blogStatus==0){
                            if(err2){
                                res.json({
                                    result: {
                                        status:'3103',
                                        message:'草稿更新失败'
                                    }
                                })
                            }else{
                                res.json({
                                    result: {
                                        status:'200',
                                        message:'草稿更新成功'
                                    },
                                    data: {
                                        id:_id
                                    }  
                                })
                            }
                        }else{
                            if(err2){
                                res.json({
                                    result: {
                                        status:'3104',
                                        message:'发布失败'
                                    }
                                })
                            }else{
                                res.json({
                                    result: {
                                        status:'200',
                                        message:'发布成功'
                                    },
                                    data: {
                                        id:_id
                                    }  
                                })
                            }
                        } 
                    })
                } 
})

//获取个人博客列表
router.get('/getBlogList',function(req,res,next){
    let userId = req.param('userId');
    let pageIndex = req.param('pageIndex');
    let pageSize = req.param('pageSize');
    let skip = (pageIndex-1)*pageSize;   //分页参数
    
    //删选的时候要选出blogStatus为1的已发布的博文
    let blogModel = Blog.find({userInfo:userId,blogStatus:1}).skip(skip).limit(pageSize);
    blogModel.sort({blogCreateTime:-1});
    blogModel.exec(function(err,doc){
        if(err){
            res.json({
                status:'3201',
                message: err.message
            })
        }else{
            res.json({
                result: {
                    status:'200',
                    message: '博客列表获取成功'
                },
                data: {
                    blogList:doc
                }
            })
        } 
    })
})

//获取推荐博客
router.get('/getRecommendedBlogs',function(req,res,next){
    let userId = req.param('userId');
    let count = req.param('count');  
   Blog.findBlogs(count)
    .then(function(docs){
        if(userId){
            User.findEverythings({_id:userId}).then(function(userDocs){
                var favouriteBlogList = userDocs.favouriteBlogList;
                if(favouriteBlogList!=null){
                    var praiseBlogList = userDocs.praiseBlogList;
                    docs.forEach(item=>{
                        favouriteBlogList.forEach(item1=>{
                            if(item._id==item1){
                                docs.liked = true;
                            }
                        });
                        praiseBlogList.forEach(item2=>{
                            if(item._id==item2){
                                docs.praised = true;
                            }
                        });
                    });
                }
                res.json({
                    result:{
                        status:'200',
                        message:'success'
                    },
                    data: {
                        blogList:docs
                    }
                })  
            })      
        }else{
            res.json({
                result:{
                    status:'200',
                    message:'success'
                },
                data: {
                    blogList:docs
                }
            })  
        } 
    })
})

//获取博客详情，需要把阅读的数量+1
router.get('/getBlogDetail',function(req,res,next){
    var _id = req.param('id');
    Blog.findOne({_id:_id},function(err,doc){
        if(err){
               res.json({
                   result: {
                       status:'304',
                       message: err.message
                       }
                   })
               }else{
                   if(doc){
                       doc.blogReadCount++;
                       doc.save()
                       .then(function(doc){
                           Blog.findBlogDetail(_id,function(err,doc2){
                               if(err){
                                   res.json({
                                       result: {
                                           status:'304',
                                           message: err.message
                                       }
                                   })
                               }else{
                                   res.json({
                                       result: {
                                           status:'200',
                                           message:'success'
                                           },
                                       data: {
                                           blogDetail: doc2
                                       }
                                   })
                               }
                           })
                       })
                   }else{
                       res.json({
                           result:{
                               status:'304',
                               message: '该文章不存在'
                           }
               })
           }
       }
})
   
})

//添加博客评论(需要的参数有评论人的id,评论的博客的id,以及评论的内容)
router.post('/addBlogComment',function(req,res,next){
    var blogId = req.body.blogId;
    var commentId = req.body.commentId;
    var commentUserInfo = req.body.commentUserId;
    var repliedUserInfo = req.body.repliedUserId;
    var content = req.body.content;
    var commentStatus = req.body.commentStatus;
    var createTime = Date.now();
    
    Blog.findOne({_id:blogId},function(err,doc){
        if(err){
            res.json({
                result:{
                    status:'302',
                    message: err.message
                }
            })
        }else{
            if(doc&&commentStatus==1){
                var blogComment = new BlogCommentList();
                blogComment.blogId = blogId;    
                blogComment.commentUserInfo = commentUserInfo;
                blogComment.repliedUserInfo = repliedUserInfo;
                blogComment.createTime = createTime;
                blogComment.blogCommentPraiseCount = 0;
                blogComment.blogCommentContent = content;
                blogComment.commentStatus = commentStatus;
                blogComment.save().then(function(blogCommentDoc){
                    doc.blogCommentCount++;
                    doc.save(function(err,newDoc){
                        if(err){
                            res.json({
                                result:{
                                    status:'302',
                                    message: err.message
                                }
                            })
                        }else{
                            res.json({
                                result:{
                                    status: '200',
                                    message: "success"
                                }
                            })
                        }
                    })
                })
            }else if(doc&&commentStatus==2){
                BlogCommentList.findOne({_id:commentId},function(err,doc){
                    var blogCommentReply = new BlogCommentReplyList();
                        blogCommentReply.replyUserInfo = commentUserInfo,
                        blogCommentReply.commentRepliedUserInfo = repliedUserInfo,
                        blogCommentReply.replyContent = content,
                        blogCommentReply.createTime = createTime,
                        blogCommentReply.replyPraiseCount = 0,
                    blogCommentReply.save(function(err,doc1){
                        if(err){
                            res.json({
                                result:{
                                    status:'302',
                                    message: err.message
                                }
                            })
                        }else{
                            var replyId = doc1._id;
                            doc.blogCommentReplyList.push(replyId);
                            doc.save(function(err,doc2){
                                if(err){
                                    res.json({
                                        result:{
                                            status:'302',
                                            message: err.message
                                        }
                                    })
                                }else{
                                    res.json({
                                        result:{
                                            status: '200',
                                            message: "success"
                                        } 
                                    })
                                }
                            })
                        }
                    })
                })
            }else{
                res.json({
                    result:{
                        status: '304',
                        message: "the blog does not exist"
                    }  
                })
            }
        }
    })
});

//获取评论以及评论的回复
router.get('/getCommentAndReply',function(req,res,next){
    var blogId = req.param('blogId');
    var commentAndReplyList = [];
    BlogCommentList.findUserByCommentId(blogId,function(err,doc){
        if(err){
            res.json({
                result:{
                    status:'302',
                    message: err.message
                } 
            })
        }else{
            if(doc){
                //将评论按时间排序;
                if(doc!=null){
                    doc.sort(larger("createTime"));
                }
                //将评论中的回复按时间排序;
                if(doc.blogCommentReplyList!=null){
                    doc.blogCommentReplyList.sort(larger("createTime"));
                }  
                res.json({
                    result:{
                        status: '200',
                        message: 'success'
                    },  
                    data: {
                        List:doc
                        }
                }) 
            }
        }
    })
});

module.exports = router;
