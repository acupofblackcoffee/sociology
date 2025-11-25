# Sociology Chronicle 開発ドキュメント

社会学の歴史的討論（Debate）と理論を体系的にアーカイブするWebサイト「Sociology Chronicle」の設計・運用マニュアルです。

## 1. プロジェクト概要

- **目的:** 社会学の知識を「年代・国家・分野・論点」の4軸で整理し、総覧・検索可能にする。
    
- **特徴:**
    
    - **JSONデータ駆動:** サイトの構造や検索インデックスはJSONで管理。
        
    - **Markdownコンテンツ:** 記事本文やカテゴリ解説はMarkdownファイル (`.md`) で記述。
        
    - **自動リンク機能:** 記事内の用語を自動検出し、リンクやツールチップを生成。
        
    - **レスポンシブUI:** PCではドロワーメニュー、スマホではオーバーレイ付きハンバーガーメニューを採用。
        

## 2. ディレクトリ構成

```
/root
├── index.html           # トップページ (検索・タイムライン)
├── article.html         # 詳細ページ (記事表示用テンプレート)
├── intro.html           # 紹介ページ (カテゴリ解説用テンプレート)
├── style.css            # デザイン定義 (Gemini/GitHub風UI)
├── app.js               # システムロジック (フィルタリング、Markdown変換など)
│
├── /data                # ★データベース (JSONファイル群)
│   ├── main_data.json   # 記事のメタデータ・検索インデックス
│   ├── taxonomy.json    # マスタデータ (カテゴリ定義)
│   └── references.json  # 文献データ
│
├── /articles            # ★記事コンテンツ (.mdファイル)
│   ├── mcdonaldization.md
│   └── ...
│
└── /introductions       # ★カテゴリ解説コンテンツ (.mdファイル)
    ├── de.md            # ドイツ社会学の解説
    ├── rationalization.md # 合理化の解説
    └── ...
```

## 3. データ仕様 (Data Schema)

サイトの挙動を制御する3つのJSONファイルの仕様です。

### ① `data/main_data.json` (記事インデックス)

すべての記事（用語、人物、論争）のメタデータを管理します。ここに登録しないとサイトに表示されません。

|   |   |   |   |
|---|---|---|---|
|**キー**|**型**|**説明**|**例**|
|`id`|string|一意のID。記事ファイル名と揃えるのが推奨。|`"term_mcdonaldization"`|
|`type`|string|記事の種類 (`term`, `person`, `debate`)。|`"term"`|
|`title`|string|表示タイトル。|`"マクドナルド化"`|
|`era_id`|string|年代ID (`taxonomy.json`と紐付け)。|`"era_late_modern"`|
|`country_id`|string|国家ID (`taxonomy.json`と紐付け)。|`"us"`|
|`field_tags`|array|分野IDのリスト。複数可。|`["theory", "econ"]`|
|`topic_tags`|array|論点IDのリスト。複数可。|`["rationalization"]`|
|`file`|string|読み込むMarkdownファイル名。**`null`にすると「スタブ（未執筆）」扱い**になる。|`"mcdonaldization.md"`|
|`summary`|string|カードやツールチップに表示される短い要約。|`"効率性が社会を支配する過程。"`|

### ② `data/taxonomy.json` (マスタデータ)

フィルタリングに使われるカテゴリ（選択肢）の定義です。

- **`eras`**: 年代リスト
    
- **`countries`**: 国家リスト
    
- **`fields`**: 分野リスト (理論、都市、家族など)
    
- **`topics`**: 論点リスト (合理化、構造と主体など)
    

各アイテムは `{ "id": "一意のID", "label": "表示名" }` の形式で記述します。 ※ここのIDと、`main_data.json` のタグIDが一致している必要があります。

### ③ `data/references.json` (文献データ)

記事内で引用される文献の一元管理リストです。

|   |   |   |
|---|---|---|
|**キー (RefID)**|**内容オブジェクト**|**説明**|
|`ref_ritzer_1993`|`{ author, year, title, url }`|記事内から `<cite id="ref_ritzer_1993"></cite>` で呼び出される。|

## 4. コンテンツ追加フロー

### A. 新しい「記事」を追加する場合

1. **Markdown作成:** `articles/` フォルダに `.md` ファイルを作成し、本文を書く。
    
2. **データ登録:** `data/main_data.json` に新しいオブジェクトを追加し、`file` にファイル名を指定する。
    

### B. 「未執筆の用語（スタブ）」を追加する場合

1. **データ登録:** `data/main_data.json` にオブジェクトを追加するが、**`file` は `null` にする。**
    
    - これだけで、他の記事内にその単語が登場した際、自動的に「点線の下線」が引かれ、要約が表示されるようになります。
        

### C. 「カテゴリ解説」を追加する場合（例：フランス社会学とは）

1. **Markdown作成:** `introductions/` フォルダに、**カテゴリIDと同じ名前**のファイルを作成する（例: `fr.md`）。
    
2. **自動反映:** `taxonomy.json` にそのIDが存在していれば、自動的に「ℹ️」ボタンやパンくずリストからリンクされます。
    

## 5. 技術スタック

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
    
- **Markdown Engine:** [marked.js](https://github.com/markedjs/marked "null") (CDN読み込み)
    
- **Infrastructure:** 静的ホスティング (GitHub Pages等で動作可能)
    

## 6. 今後の拡張アイデア

- 全文検索機能の実装
    
- 引用ネットワークの可視化（D3.js等）
    
- ダークモード対応
