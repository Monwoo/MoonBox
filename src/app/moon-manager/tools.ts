// Copyright Monwoo 2018, made by Miguel Monwoo, service@monwoo.com

export function shallowMerge(level: number, ...objs: any) {
  let res = {};
  objs.forEach((o: any) => {
    if (o) {
      Object.keys(o).forEach(k => {
        const v = o[k];
        if (level > 0 && typeof v === 'object' && Object.keys(v).length) {
          res[k] = shallowMerge(level - 1, res[k], v);
        } else {
          res[k] = v;
        }
      });
    }
  });
  return res;
}
