//index.js
const app = getApp()
var interval = null;

Page({
  data: {
    pages: ['timer', 'shelf'],
    imgUrl: 'images/timerFrame.png',
    previousMargin: 30,
    nextMargin: 30,
    idx: 0,
    current: 1,
    isClick: 0,
    time: 0,
    displayTime: '00:00:00',
    shelf: [],
    latest_books: [],
    bookcount: 0,
    bookpage: '',
    tempFileUrl: [],
    tempFilePath: '',
    totalTime: 0
  },

  onLoad: function() {
    var that = this
    if (!wx.cloud) {
      wx.redirectTo({
        url: '../chooseLib/chooseLib',
      })
      return
    }
    wx.showLoading({
      title: '加载中',
    })
  },

  onShow: function() {
    this.getShelf()
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }
    if (!interval && this.data.time != 0) {
      interval = setInterval(() => {
        this.setData({
          time: this.data.time + 1,
          displayTime: this.parseTime(this.data.time)
        })
      }, 10);
    }
  },

  onHide: function() {
    if (interval) {
      clearInterval(interval);
      interval = null;
    } else {
      this.setData({
        time: 0,
        displayTime: '00:00:00'
      })
    }
  },

  parseTime: function() {
    var hh = parseInt(this.data.time / 100 / 3600);
    if (hh < 10) hh = '0' + hh;
    var mm = parseInt(this.data.time / 100 / 60 % 60);
    if (mm < 10) mm = '0' + mm;
    var ss = parseInt(this.data.time % 6000 / 100);
    if (ss < 10) ss = '0' + ss;
    return `${hh}:${mm}:${ss}`
  },

  startTimer: function() {
    if (!interval) {
      interval = setInterval(() => {
        this.setData({
          isClick: 1,
          time: this.data.time + 1,
          displayTime: this.parseTime(this.data.time)
        })
      }, 10);
    }
  },

  stopTimer: function() {
    var that = this
    clearInterval(interval);
    interval = null;
    this.setData({
      isClick: 0,
      time: 0,
      totalTime: that.calcTotal(that.data.displayTime),
      displayTime: '00:00:00'
    })
    console.log(that.data.totalTime)
    const db = wx.cloud.database()
    const _ = db.command
    db.collection('user').doc(app.globalData.id).get({
      success: res => {
        var time = parseInt(res.data.time_counter) + that.data.totalTime
        db.collection('user').doc(app.globalData.id).update({
          data: {
            time_counter: _.set(time)
          }
        })
      }
    })
  },

  calcTotal: function(n) {
    var t = n.split(':')
    var h = parseInt(t[0])
    var m = parseInt(t[1])
    var s = parseInt(t[2])
    return h * 3600 + m * 60 + s
  },

  getShelf: function() {
    var that = this
    app.getUserInfo().then(function(res) {
      var shelf = res.data.shelf
      var latest = res.data.shelf
      if (shelf.length > 4) {
        latest = shelf.slice(shelf.length - 4, shelf.length)
      }
      var temp_1 = latest.slice(0, 2)
      var temp_2 = latest.slice(2, 4)
      var data = [temp_1, temp_2]
      that.setData({
        bookcount: shelf.length,
        latest_books: data
      })
      wx.hideLoading()
    })
  },

  // 跳转至打卡日历或书架
  redirectTo: function(e) {
    if (e.currentTarget.dataset.page == "timer") {
      wx.switchTab({
        url: '../calendar/calendar',
      })
    } else {
      wx.navigateTo({
        url: '../shelf/shelf',
      })
    }
  },

  // 打开书本
  openBook: function(e) {
    wx.showLoading({
      title: '加载中',
    })
    var that = this
    var name = e.currentTarget.dataset.bookname
    const db = wx.cloud.database()
    const _ = db.command
    // 根据书名和用户ID在bookCollection中找到fileID
    db.collection('bookCollection').where({
      bookName: _.eq(name),
      bookOwner: app.globalData.id
    }).get({
      success: res => {
        console.log(res.data)
        var fileID = res.data.reverse()[0].bookFileId
        // 根据fileID换取https地址
        wx.cloud.getTempFileURL({
          fileList: [fileID],
          success: res => {
            console.log(res.fileList)
            var data = res.fileList[0].tempFileURL
            wx.request({
              url: data,
              data: {},
              success: res => {
                var query_clone = res.data
                wx.hideLoading()
                wx.navigateTo({
                  url: '../readingPage/readingPage?content=' + encodeURIComponent(query_clone) + '&title=' + name,
                })
              }
            })
          },
          fail: err => {
          }
        })
      },
      fail: console.err
    })
  },

  // 上传书本
  readFile: function(e) {
    var that = this
    console.log(getApp().globalData.id)
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      success(res) {
        console.log(res)
        const tempFilePath = res.tempFiles
        var filePath = tempFilePath[0].path
        const fileName = tempFilePath[0].name
        if (filePath.match(/\.[^.]+?$/)[0] == '.txt') {
          wx.cloud.uploadFile({
            cloudPath: app.globalData.id + '/' + fileName,
            filePath: tempFilePath[0].path,
            success: function(res) {
              var latest = that.data.latest_books
              latest.push(fileName)
              that.getShelf()
              app.globalData.shelf = latest.slice(1, 5)
              const db = wx.cloud.database()
              const _ = db.command
              db.collection('bookCollection').add({
                data: {
                  bookImage: '',
                  bookName: fileName,
                  bookOwner: app.globalData.id,
                  bookFileId: res.fileID
                },
                success: res => {
                  db.collection('user').doc(app.globalData.id).update({
                    data: {
                      shelf: _.push(fileName)
                    }
                  })
                },
                fail: err => {
                  console.error('[数据库] [新增记录] 失败：', err)
                }
              })
            },
            fail: console.err
          })
        } else {
          wx.showToast({
            icon: 'none',
            title: '只能上传txt文件！',
          })
          wx.navigateBack({
            delta: 1,
          })
        }
      }
    })
  },
})