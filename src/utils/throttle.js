function throttle(fn, interval, options = { leading: true, trailing: false}) {
  const { leading, trailing } = options;

  // 上次执行的时间
  let preTime = 0;

  // 控制最后执行函数的定时器
  let timer = null;

  const _throttle = function(...args) {
    // 当前时间戳
    const nowTime = new Date().getTime();

    // 控制首次执行
    // 若 leading 为 false，则表示首次不执行
    // 将 preTime 设置为 nowTime，表示上次已经执行过了，不需再次执行
    if (!leading && !preTime) preTime = nowTime;

    // 剩余时间
    const remainTime = interval - (nowTime - preTime);

    if (remainTime <= 0) {
      // 清除定时器
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }

      // 执行函数
      fn.apply(this, args);

      // 记录执行时间
      preTime = nowTime;

      return;
    }
    
    // 控制最后执行
    if (trailing && !timer) {
      timer = setTimeout(() => {
        timer = null;
        
        // 当设置 { leading: false } 时
        // 每次触发回调函数后设置 preTime 为 0
        // 不然为当前时间
        // 防止中间执行两次
        preTime = !leading ? 0 : new Date().getTime();

        // 执行函数
        fn.apply(this, args);
      }, remainTime);
    }
  };

  _throttle.cancel = function() {
    if (timer) clearTimeout(timer);
    timer = null;
    preTime = 0;
  }

  return _throttle;
}

export default throttle;
