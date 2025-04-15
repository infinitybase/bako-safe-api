import { enqueueImmediateDeposit } from "@/queues/depositProcess/handlers";
import { Router } from "express";

const router = Router();

router.post("/deposit/new", async (req, res) => {
  const { predicate_id, predicate_address } = req.body;

  if (!predicate_id || !predicate_address) {
    return res.status(400).json({ error: "Dados incompletos." });
  }

  try {
    await enqueueImmediateDeposit(predicate_id, predicate_address);
    return res.status(200).json({ message: "Transação enfileirada com prioridade." });
  } catch (err) {
    console.error("Erro ao enfileirar transação prioritária:", err);
    return res.status(500).json({ error: "Erro ao adicionar na fila." });
  }
});

export { router };
