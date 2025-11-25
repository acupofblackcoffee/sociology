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

## 3. 開発環境・実行方法 (How to Run)

このサイトは `fetch` APIを使用してローカルのJSONやMarkdownファイルを読み込みます。ブラウザのセキュリティポリシー（CORS）により、HTMLファイルを直接ダブルクリックして開くと動作しない場合があります。

### 推奨される実行方法

VS Codeの拡張機能 **「Live Server」** を使用してください。

1. VS Codeでプロジェクトフォルダを開く。
    
2. `index.html` を右クリックし、**"Open with Live Server"** を選択。
    
3. ローカルサーバー（例: `http://127.0.0.1:5500`）上でサイトが起動します。
    

## 4. データ仕様と命名規則 (Data Schema & Conventions)

### ① `data/main_data.json` (記事インデックス)

| **キー** | **型** | **説明** | **命名規則 (Naming Convention)** | | `id` | string | 一意のID。記事ファイル名と一致させる。 | `term_xxx` (用語), `person_xxx` (人物), `debate_xxx` (論争) | | `type` | string | 記事の種類。 | `"term"`, `"person"`, `"debate"` | | `title` | string | 表示タイトル。 | 正式名称 | | `era_id` | string | 年代ID (`taxonomy.json`参照)。 | `era_xxx` | | `country_id` | string | 国家ID (`taxonomy.json`参照)。 | `de`, `fr`, `us`, `jp`, `uk` (ISO 2文字コード推奨) | | `field_tags` | array | 分野IDリスト。 | `theory`, `urban`, `family` 等 | | `topic_tags` | array | 論点IDリスト。 | 英語の小文字スネークケース推奨 (例: `structure_agency`) | | `file` | string | マークダウンファイル名。**`null`でスタブ化**。 | `id` + `.md` (例: `term_anomie.md`) | | `summary` | string | 短い要約（カード表示用）。 | 40〜60文字程度推奨。 |

### ② `data/taxonomy.json` (マスタデータ)

フィルタリング項目の定義。

- **`eras`**: 年代リスト
    
- **`countries`**: 国家リスト
    
- **`fields`**: 分野リスト
    
- **`topics`**: 論点リスト
    

### ③ `data/references.json` (文献データ)

記事内で `<cite id="ref_key"></cite>` として引用する文献リスト。

- **ID命名規則:** `ref_著者名_発行年` （例: `ref_ritzer_1993`, `ref_weber_1905`）
    

## 5. コンテンツ追加フロー

### A. 新しい「記事」を追加する場合

1. **Markdown作成:** `articles/` フォルダに `.md` ファイルを作成し、本文を書く。
    
2. **データ登録:** `data/main_data.json` に新しいオブジェクトを追加し、`file` にファイル名を指定する。
    

### B. 「未執筆の用語（スタブ）」を追加する場合

1. **データ登録:** `data/main_data.json` にオブジェクトを追加するが、**`file` は `null` にする。**
    
    - これだけで、他の記事内にその単語が登場した際、自動的に「点線の下線」が引かれ、要約が表示されるようになります。
        

### C. 「カテゴリ解説」を追加する場合

1. **Markdown作成:** `introductions/` フォルダに、**カテゴリIDと同じ名前**のファイルを作成する（例: `fr.md`）。
    
2. **自動反映:** `taxonomy.json` にそのIDが存在していれば、自動的に「Bookアイコン」やパンくずリストからリンクされます。
    

## 6. デプロイ（公開）について

GitHub Pagesなどの静的ホスティングサービスで即座に公開可能です。ビルドプロセスは不要です。

- **GitHub Pagesの設定:**
    
    - リポジトリ設定 > Pages > Source を `main` ブランチの `/ (root)` に設定するだけ。
        

## 7. 技術スタック

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
    
- **Markdown Engine:** [marked.js](https://github.com/markedjs/marked "null") (CDN読み込み)
    

## 8. 今後の拡張アイデア

- 全文検索機能の実装（クライアントサイド検索）
    
- 引用ネットワークの可視化（D3.js等で相関図を描画）
    
- ダークモード対応
