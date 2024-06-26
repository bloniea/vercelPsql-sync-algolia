const { Client: PGClient } = require("pg")
const algoliasearch = require("algoliasearch")

// 连接到 PostgreSQL 数据库
console.log(process.env.PSQLURL)
const pgClient = new PGClient({
  connectionString: process.env.PSQLURL,
})
pgClient.connect()
// Algolia 应用ID和API密钥
const algoliaAppId = process.env.ALGOLIAAPPID
const algoliaApiKey = process.env.ALGOLIAAPIKEY
const algoliaIndexName = process.env.ALGOLIAINDEXNAME
// 创建 Algolia 搜索客户端
const algoliaClient = algoliasearch(algoliaAppId, algoliaApiKey)
const algoliaIndex = algoliaClient.initIndex(algoliaIndexName)

// 从 PostgreSQL 中检索数据并上传到 Algolia
async function syncDataToAlgolia() {
  try {
    const result = await pgClient.query(
      "SELECT articles.*, categories.name as category_title,categories.img_url as category_img_url  FROM articles JOIN categories ON articles.category_id = categories.category_id"
    )
    const records = result.rows.map((row) => ({
      objectID: row.article_id, // 假设你有一个表示唯一标识符的字段，比如id
      // 假设你有其他字段需要同步到 Algolia
      // 例如：title, description, createdAt, updatedAt等等
      content: compressAndStripMarkdown(row.content),
      category_title: row.category_title,
      title: row.title,
      img_url: row.img_url,
      url: `/article?id=${row.article_id}`,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // ...
    }))

    // 将数据上传到 Algolia
    await algoliaIndex.saveObjects(records)

    console.log("Data synced to Algolia successfully")
  } catch (error) {
    console.error("Error syncing data to Algolia:", error)
  } finally {
    // 关闭 PostgreSQL 连接
    pgClient.end()
  }
}

function compressAndStripMarkdown(input) {
  // 去除行首的空格
  let compressed = input.trim()
  compressed = compressed.replace(
    /^#+\s*|^\*\s*|^-\s*|^(\d+)\.\s*|^\[.*?\]\(.*?\)|^\!\[.*?\]\(.*?\)/gm,
    ""
  )
  // 去除行内的空格
  compressed = compressed.replace(/\s+/g, " ")

  // 去除多余的空行
  compressed = compressed.replace(/\n{2,}/g, "\n")

  compressed = compressed.replace(/\[(.*?)\]\((.*?)\)/g, "")
  return compressed
}

// 同步数据到 Algolia
syncDataToAlgolia()
