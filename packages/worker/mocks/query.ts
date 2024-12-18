// [BALANCE POR VAULT]
// db.getSiblingDB("dev").getCollection("predicate_balance")
//        .aggregate([
//     {
//       $match: {
//         verifiedToken: true
//       }
//     },
//     {
//       $group: {
//         _id: "$predicate",
//         totalUsdValue: { $sum: "$usdValue" }
//       }
//     },
//     {
//       $sort: { totalUsdValue: -1 }
//     }
//   ]);
  

// [BALANCE BAKO VAULT]

// db.getSiblingDB("dev").getCollection("predicate_balance")
//   .aggregate([
//     {
//       $match: {
//         usdValue: { $ne: NaN }, // Filtra explicitamente para ignorar valores NaN
//         predicate: "0xec8ff99af54e7f4c9dd81f32dffade6b41f3b980436ee2eabf47a069f998cd73"
//       }
//     },
//     {
//       $group: {
//         _id: "$predicate", // Não agrupa por nenhum campo
//         totalUsdValue: { $sum: "$usdValue" } // Soma apenas os valores válidos
//       }
//     }
//   ]);

// [BALANCE TOTAL]

// db.getSiblingDB("dev").getCollection("predicate_balance")
//   .aggregate([
//     {
//       $match: {
//         verifiedToken: true, // Considera apenas documentos com verifiedToken igual a true
//         usdValue: { $ne: NaN } // Filtra explicitamente para ignorar valores NaN
//       }
//     },
//     {
//       $group: {
//         _id: null, // Não agrupa por nenhum campo
//         totalUsdValue: { $sum: "$usdValue" } // Soma apenas os valores válidos
//       }
//     }
//   ]);


// [BALANCE DEPOSITADO]

// db.getSiblingDB("dev").getCollection("predicate_balance")
//   .aggregate([
//     {
//       $match: {
//         verifiedToken: true, // Filtra documentos com "verifiedToken" igual a true
//         usdValue: { $gt: 0 } // Ignora valores negativos, zeros, e automaticamente ignora NaN
//       }
//     },
//     {
//       $group: {
//         _id: null, // Não agrupa por nenhum campo
//         totalUsdValue: { $sum: "$usdValue" } // Soma os valores válidos
//       }
//     }
//   ]);


// [TX NAO DEPOSITOS CONTADOR]

// db.getSiblingDB("dev").getCollection("predicate_balance")
//   .aggregate([
//     {
//       $match: {
//         isDeposit: false // Filtra apenas documentos onde "isDeposit" é false
//       }
//     },
//     {
//       $group: {
//         _id: "$tx_id", // Agrupa pelos valores únicos do campo "tx_id"
//       }
//     },
//     {
//       $count: "uniqueTxCount" // Conta o número de transações únicas
//     }
//   ]);

