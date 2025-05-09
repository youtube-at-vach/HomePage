---
marp: true
theme: default
paginate: true
style: |
  section {
    font-size: 120%;
  }
---

# TL072代替オペアンプの比較  
オーディオ用途（最大1MHz帯域）でTL072からの置換を検討

---

## 主要スペック比較

| オペアンプ           | メーカー       | ノイズ (nV/√Hz@1kHz) | GBW (MHz) | SR (V/μs) | THD+N (@1kHz) | 主な特徴                  |
|----------------------|--------------|-----------------------|-----------|-----------|---------------|---------------------------|
| **TL072**            | TI / ST      | 37                    | 3         | 13        | ~0.003%       | 汎用JFET、低コスト       |
| **NE5532**           | TI           | ≈5                    | 10        | 9         | ~0.002%       | 低ノイズ・出力ドライバ   |
| **OPA2134/OPA134**   | TI (BB)      | 8                     | 8         | 20        | 0.00008%      | 高音質FET入力アンプ       |
| **OPA1642/OPA1644**  | TI           | 5.1                   | 11        | 20        | 0.00005%      | 低歪・レールツーレール出力 |
| **OPA2140**          | TI           | 5.1                   | 11        | 20        | 0.00005%      | 高精度・RRO出力           |
| **AD8620**           | ADI          | 6                     | 25        | ~50       | <0.0006%      | 高速・低オフセット       |
| **LM4562**           | TI           | 2.7                   | 55        | 20        | 0.00003%      | 高駆動力・超低歪         |

---

## 各アンプの適用例

- **TL072**  
  プリアンプ、アクティブフィルタ、バッファ。低コスト汎用。

- **NE5532**  
  ミキサー出力、ラインドライバ。±2.5～±18V動作、600Ω駆動。

- **OPA2134/OPA134**  
  ハイエンドプリアンプ、DAC後段、EQ。低歪・低ノイズ。

- **OPA1642/OPA2140**  
  DCカップルADCドライバ、ヘッドフォンAMP。レールツーレール出力。

- **AD8620**  
  高速センサ前段、差動バッファ。広帯域・高精度。

- **LM4562**  
  ヘッドフォン、アクティブスピーカー出力。高出力駆動。

---

## 結論

- **OPA1642/OPA2140** が最もバランス良く高性能  
  - ノイズ 5.1 nV/√Hz、GBW 11 MHz、THD 0.00005%  
  - RRO出力でDCカップル回路や高性能バッファに最適  

- コスト重視なら **NE5532**、TL072の高速版 **TL072H** も選択肢  

- 高帯域・超低歪を求めるなら **LM4562**  

---

Thank you!
