# 手取り試算の参照実装（JSと同一ロジックにする正本）
# 2026年分＝令和8年分 / 2027年分＝令和9年分（基礎控除は恒久措置58万）
NENKIN = 215_040          # 国民年金 年額（2026年度）
KOKUHO_RATE = 0.1067      # 東京23区 所得割（医療+支援+介護なし）
KOKUHO_KINTO = 66_300     # 均等割（1人）
KOKUHO_KAIGO_RATE = 0.0229   # 40歳以上の介護分 所得割
KOKUHO_KAIGO_KINTO = 16_200  # 介護分 均等割
KOKUHO_KISO = 430_000     # 国保の基礎控除
JUMIN_KISO = 430_000
JIGYOZEI_KOJO = 2_900_000

def shotoku_zei(k):
    k = int(k) // 1000 * 1000
    if k <= 0: return 0
    if k <= 1_950_000: t = k*0.05
    elif k <= 3_300_000: t = k*0.10 - 97_500
    elif k <= 6_950_000: t = k*0.20 - 427_500
    elif k <= 9_000_000: t = k*0.23 - 636_000
    elif k <= 18_000_000: t = k*0.33 - 1_536_000
    elif k <= 40_000_000: t = k*0.40 - 2_796_000
    else: t = k*0.45 - 4_796_000
    return int(t*1.021)//100*100

def kiso_kojo(gokei, year):
    if year == 2026:   # 令和8年分の上乗せあり
        if gokei <= 1_320_000: return 950_000
        if gokei <= 3_360_000: return 880_000
        if gokei <= 4_890_000: return 680_000
        if gokei <= 6_550_000: return 630_000
        return 580_000
    return 580_000     # 2027年分以降は恒久措置

def kiso_kojo_jumin(gokei):
    return 430_000

def tedori(uriage, keihi, aoiro_kojo, year, age40=False, shaho=False, kazoku=0):
    jigyo = max(0, uriage - keihi)                 # 事業所得（青色控除前）
    aoiro = min(aoiro_kojo, jigyo)
    gokei = jigyo - aoiro                          # 合計所得金額
    # 個人事業税（青色特別控除は不適用）
    jbase = jigyo - JIGYOZEI_KOJO
    jz = int((jbase//1000*1000)*0.05)//100*100 if jbase > 0 else 0
    # 社会保険料
    if shaho:
        ss = int(gokei * 0.15)                     # 概算（家族の扶養/社保加入）
    else:
        rate = KOKUHO_RATE + (KOKUHO_KAIGO_RATE if age40 else 0)
        kinto = KOKUHO_KINTO + (KOKUHO_KAIGO_KINTO if age40 else 0)
        n = 1 + kazoku
        kokuho = max(0, gokei - KOKUHO_KISO)*rate + kinto*n
        kokuho = min(kokuho, 1_090_000)            # 賦課限度額
        ss = int(kokuho) + NENKIN*(1+kazoku if kazoku else 1)
    # 所得税
    st = shotoku_zei(gokei - ss - kiso_kojo(gokei, year))
    # 住民税
    JUMIN_HIKAZEI = 450_000        # 均等割の非課税限度（単身・東京23区）
    if gokei <= JUMIN_HIKAZEI:
        jt = 0                     # 所得割・均等割ともに非課税
    else:
        kj = gokei - ss - kiso_kojo_jumin(gokei)
        jt = int((int(kj)//1000*1000)*0.10) - 2_500 + 5_000 if kj > 0 else 5_000
    return {
        "jigyo": jigyo, "aoiro": aoiro, "gokei": gokei,
        "jigyozei": jz, "shaho": ss, "shotokuzei": st, "juminzei": int(jt),
        "tedori": round(uriage - keihi - jz - ss - st - jt),
    }

if __name__ == "__main__":
    # ECLART確定版（売上500万・経費率40%・2027年75万控除）と一致するか検証
    r_w = tedori(5_000_000, 2_000_000, 0,       2027)
    r_a = tedori(5_000_000, 2_000_000, 750_000, 2027)
    print("白色 2027:", f"{r_w['tedori']:,}", "（README: 2,140,441）")
    print("青75 2027:", f"{r_a['tedori']:,}", "（README: 2,321,666）")
    print("差額:", f"{r_a['tedori']-r_w['tedori']:+,}", "（README: +181,225）")
