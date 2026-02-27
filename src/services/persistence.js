
import { prisma } from '../db/client.js';
import { logger } from '../utils/logger.js';

export async function createDebate({ topic, scientistA, scientistB, firstSpeaker, totalTurns }) {
  const debate = await prisma.debate.create({
    data: { topic, scientistA, scientistB, firstSpeaker, totalTurns, status: 'running' },
  });
  logger.info({ debateId: debate.id }, 'Debate created');
  return debate;
}

export async function appendMessage({ debateId, turn, speaker, model, text }) {
  return prisma.message.create({ data: { debateId, turn, speaker, model, text } });
}

export async function appendVisualization({ debateId, payload }) {
  return prisma.visualization.create({
    data: {
      debateId,
      kind: payload.type || 'chart',
      chart: payload.chart,
      title: payload.title || null,
      labels: payload.labels || undefined,
      series: payload.series || [],
    },
  });
}

export async function completeDebate({ debateId }) {
  await prisma.debate.update({ where: { id: debateId }, data: { status: 'done' } });
}

export async function errorDebate({ debateId }) {
  try { await prisma.debate.update({ where: { id: debateId }, data: { status: 'error' } }); } catch {}
}

export async function getDebateById(id) {
  return prisma.debate.findUnique({
    where: { id },
    include: {
      messages: { orderBy: { turn: 'asc' } },
      visualizations: { orderBy: { createdAt: 'asc' } },
    },
  });
}

export async function listDebates({ limit = 20 } = {}) {
  return prisma.debate.findMany({
    take: limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      topic: true,
      scientistA: true,
      scientistB: true,
      status: true,
      totalTurns: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}
