// 設定の数字（11/28・issue #27）。見た目・音だけなので CONFIG_VERSION は上げない
// 音の大きさ：消す・小さい・ふつう（保存の vol＝0〜2）。全体の音量にかける倍率
export const VOL = [0, 0.5, 1];
export const VOL_DEFAULT = 2;
// データを消す：押してから次を押すまで待つ秒（すぎたら最初の字にもどる）
export const WIPE_WAIT = 4;
// 帳面の取組記録（#28）：のこす取組の数（古いものから消える・保存が重すぎるときは 20 に）
export const LOG_MAX = 30;
