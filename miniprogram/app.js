//app.js
App({

  globalData: {
    openid: "",
    id: "",
    logFlag: false,
    shelf: []
  },

  onLaunch: function() {
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
    } else {
      wx.cloud.init({
          traceUser: true,
        }),

        // 调用云函数得到用户的openid
        wx.cloud.callFunction({
          name: 'login',
          data: {},
          success: res => {
            console.log('[云函数] [login] user openid: ', res.result.openid)
            this.globalData.openid = res.result.openid
            this.openid = res.result.openid
            console.log('this.globalData是: ', this.globalData)
            //与数据库进行比对，插入一条初始化的用户记录
            const db = wx.cloud.database()
            // 查询一下数据库中有没有这个用户
            console.log("Here", this.globalData)
            db.collection('user').where({
              // _openid: this.globalData.openid
              _openid: db.command.eq(this.globalData.openid)
            }).get({
              success: res => {
                // this.setData({
                //   queryResult: JSON.stringify(res.data, null, 2)
                // })
                console.log('成功')
                console.log(res.data)
                //const db = wx.cloud.database()
                if (res.data.length == 0) {
                  db.collection('user').add({
                    data: {
                      userName: "",
                      avatarUrl: "",
                      bookId_collection: [],
                      bookId_favorite: [],
                      checkin_days: [],
                      description: "点击头像设置个性签名",
                      noteId: [],
                      planId: [],
                      time_counter: [],
                      shelf: []
                    },
                    success: res => {
                      // 在返回结果中会包含新创建的记录的 _id
                      this.globalData.id = res._id
                      wx.showToast({
                        title: '新增记录成功',
                      })
                      console.log('[数据库] [新增记录] 成功，记录 _id: ', res._id)
                    },
                    fail: err => {
                      wx.showToast({
                        icon: 'none',
                        title: '新增记录失败'
                      })
                      console.error('[数据库] [新增记录] 失败：', err)
                    }
                  })
                } else {
                  //数据库中已经有这个用户了，获取ta的数据库id
                  this.globalData.id = res.data[0]._id
                  wx.getSetting({
                    success: res => {
                      console.log(res)
                      if (res.authSetting['scope.userInfo']) {
                        this.globalData.logFlag = true
                        db.collection('user').doc(this.globalData.id).get({
                          success: res => {
                            console.log('成功')
                            console.log(res.data)
                            var shelf = []
                            if (res.data.shelf.length > 4) {
                              shelf = res.data.shelf.slice(3)
                            } else {
                              shelf = res.data.shelf
                            }
                            this.globalData.shelf = shelf
                            console.log(this.globalData.shelf)
                          },
                          fail: err => {
                            wx.showToast({
                              icon: 'none',
                              title: '查询记录失败'
                            })
                            console.log(err)
                          }
                        })
                      } else {
                        wx.showToast({
                          title: '登录后才能进行阅读哦！',
                        })
                      }
                    }
                  })
                }
              },
              fail: err => {
                wx.showToast({
                  icon: 'none',
                  title: '查询记录失败'
                })
                console.log('[数据库] [查询记录] 失败')
              }
            })
          },
          fail: err => {
            console.error('[云函数] [login] 调用失败', err)
            wx.navigateTo({
              url: '../deployFunctions/deployFunctions',
            })
          }
        })

    }

  }
})