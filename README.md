# 語彙学習フラッシュカードアプリ

## セットアップ

### 1. 依存パッケージのインストール

```bash
cd vocabulary-app
npm install
```

### 2. Firebase設定（クラウド同期を使う場合）

1. https://console.firebase.google.com/ でプロジェクトを作成
2. Authentication → ログイン方法 → メール/パスワード を有効化
3. Firestore Database を作成（テストモードで開始）
4. プロジェクト設定 → マイアプリ → ウェブアプリを追加 → SDK設定をコピー
5. `.env.example` を `.env` にコピーして値を入力

**Firestoreセキュリティルール（本番用）:**
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/cards/{cardId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 3. 起動

```bash
npm run dev
```

ブラウザで http://localhost:5173 を開いてください。

### 4. ビルド（本番用）

```bash
npm run build
```

## Androidへのインストール（PWA）

1. ChromeでアプリのURLを開く
2. ブラウザメニュー →「ホーム画面に追加」
3. ネイティブアプリのように使用可能

## CSVフォーマット

インポート用CSVの列: `japanese,english,notes`

```csv
japanese,english,notes
りんご,apple,赤い果物
犬,dog,ペットとして人気
```
