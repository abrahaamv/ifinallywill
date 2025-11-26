import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
} from 'lucide-react';
import type { MessageMetadata } from '../../types/message';

interface MessageDebugPanelProps {
  metadata: MessageMetadata;
}

export function MessageDebugPanel({ metadata }: MessageDebugPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);

  // Helper: Get quality color/status
  const getQualityStatus = (value: number): { color: string; label: string; icon: string } => {
    if (value >= 0.8) return { color: 'text-green-600 dark:text-green-400', label: 'Excellent', icon: '✅' };
    if (value >= 0.6) return { color: 'text-yellow-600 dark:text-yellow-400', label: 'Fair', icon: '⚠️' };
    return { color: 'text-red-600 dark:text-red-400', label: 'Poor', icon: '❌' };
  };

  // Helper: Render progress bar
  const ProgressBar = ({ value }: { value: number }) => {
    const percentage = Math.round(value * 100);
    const status = getQualityStatus(value);
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-1">
          <span className={`text-xs font-medium ${status.color}`}>
            {status.icon} {percentage}% ({status.label})
          </span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div
            className={`h-full ${status.color.replace('text-', 'bg-')} transition-all`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  };

  // Calculate overall health score
  const calculateHealthScore = (): number => {
    if (!metadata.ragas) return 0.75; // Default reasonable score
    return metadata.ragas.overall;
  };

  // Get quality recommendations
  const getRecommendations = (): string[] => {
    const recommendations: string[] = [];

    if (metadata.ragas) {
      if (metadata.ragas.contextRecall < 0.5) {
        recommendations.push('📚 Context Recall is low (< 50%) - Consider uploading more relevant documents');
      }
      if (metadata.ragas.faithfulness < 0.61) {
        recommendations.push('🎯 Faithfulness is fair (< 61%) - Review if answer matches your knowledge base');
      }
      if (metadata.ragas.contextRelevancy < 0.5) {
        recommendations.push('🔍 Context Relevancy is low (< 50%) - Review document quality and chunking strategy');
      }
    }

    if (metadata.performance) {
      if (metadata.performance.totalLatencyMs > 6000) {
        recommendations.push('⚡ Performance is slow (> 6s) - Consider optimization or increasing resources');
      } else if (metadata.performance.totalLatencyMs < 3000) {
        recommendations.push('✨ Performance is excellent (< 3s) - No action needed');
      }
    }

    return recommendations;
  };

  if (!isExpanded) {
    // Compact collapsed view
    return (
      <div className="mt-2 border-t border-border pt-2">
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          Developer Info
          {metadata.ragas && (
            <span className={`ml-2 font-medium ${getQualityStatus(metadata.ragas.overall).color}`}>
              {getQualityStatus(metadata.ragas.overall).icon} {Math.round(metadata.ragas.overall * 100)}%
            </span>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 border-t border-border pt-2">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setIsExpanded(false)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
          Developer Info
        </button>

        {/* User/Developer Mode Toggle */}
        <button
          onClick={() => setIsDeveloperMode(!isDeveloperMode)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          title={isDeveloperMode ? 'Switch to User View' : 'Switch to Developer View'}
        >
          {isDeveloperMode ? (
            <>
              <Eye className="w-3 h-3" />
              <span>User View</span>
            </>
          ) : (
            <>
              <EyeOff className="w-3 h-3" />
              <span>Developer View</span>
            </>
          )}
        </button>
      </div>

      {/* Developer Mode - Original Format (Easy to Copy) */}
      {isDeveloperMode && (
        <div className="space-y-3 text-xs">
          {/* Model & Routing */}
          {metadata.modelRouting && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Model Routing</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Model: {metadata.modelRouting.selectedModel}</div>
                <div>Tier: {metadata.modelRouting.modelTier}</div>
                <div>Provider: {metadata.modelRouting.provider}</div>
                <div>Attempt: {metadata.modelRouting.attemptNumber}</div>
                {metadata.modelRouting.wasEscalated && (
                  <div className="col-span-2 text-orange-600 dark:text-orange-400">
                    ⚠️ Escalated ({metadata.modelRouting.fallbacksAvailable} fallbacks available)
                  </div>
                )}
                <div className="col-span-2 mt-1 text-xs opacity-75">
                  Reasoning: {metadata.modelRouting.reasoning}
                </div>
              </div>
            </div>
          )}

          {/* Complexity & Confidence */}
          {(metadata.complexity || metadata.confidence) && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Analysis</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                {metadata.complexity && (
                  <>
                    <div>Complexity: {metadata.complexity.level}</div>
                    <div>Score: {(metadata.complexity.score * 100).toFixed(1)}%</div>
                    <div className="col-span-2 text-xs opacity-75">
                      Factors: entities={metadata.complexity.factors.entityCount},
                      depth={metadata.complexity.factors.depth},
                      technical={metadata.complexity.factors.technicalTerms}
                    </div>
                  </>
                )}
                {metadata.confidence && (
                  <>
                    <div>Confidence: {(metadata.confidence.score * 100).toFixed(1)}%</div>
                    {metadata.confidence.requiresEscalation && (
                      <div className="text-red-600 dark:text-red-400">⚠️ Low confidence</div>
                    )}
                    <div className="col-span-2 text-xs opacity-75">
                      Indicators: uncertainty={metadata.confidence.indicators.uncertainty.toFixed(2)},
                      specificity={metadata.confidence.indicators.specificity.toFixed(2)}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* RAG Context */}
          {metadata.rag && metadata.rag.chunksRetrieved > 0 && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">RAG Retrieval</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Chunks: {metadata.rag.chunksRetrieved}</div>
                <div>Method: {metadata.rag.method}</div>
                <div>Relevance: {metadata.rag.topRelevance}</div>
                <div>Reranking: {metadata.rag.rerankingApplied ? 'Yes' : 'No'}</div>
                <div>Latency: {metadata.rag.processingTimeMs}ms</div>
              </div>
              {metadata.rag.chunks.length > 0 && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                    View Retrieved Chunks ({metadata.rag.chunks.length})
                  </summary>
                  <div className="mt-2 space-y-2 max-h-64 overflow-y-auto">
                    {metadata.rag.chunks.map((chunk, idx) => (
                      <div key={chunk.id} className="p-2 bg-muted/50 rounded text-xs">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-medium">Chunk {idx + 1}</span>
                          <span className="text-muted-foreground">Score: {chunk.score.toFixed(3)}</span>
                        </div>
                        <div className="text-muted-foreground mb-1">Source: {chunk.source}</div>
                        <div className="text-foreground/80 line-clamp-3">{chunk.content}</div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          )}

          {/* RAGAS Metrics */}
          {metadata.ragas && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">RAGAS Quality Metrics</div>
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Overall:</span>
                  <span className={metadata.ragas.overall >= 0.8 ? 'text-green-600 dark:text-green-400' : metadata.ragas.overall >= 0.6 ? 'text-yellow-600 dark:text-yellow-400' : 'text-red-600 dark:text-red-400'}>
                    {(metadata.ragas.overall * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Faithfulness:</span>
                  <span>{(metadata.ragas.faithfulness * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Answer Relevancy:</span>
                  <span>{(metadata.ragas.answerRelevancy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Context Relevancy:</span>
                  <span>{(metadata.ragas.contextRelevancy * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Context Precision:</span>
                  <span>{(metadata.ragas.contextPrecision * 100).toFixed(1)}%</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Context Recall:</span>
                  <span>{(metadata.ragas.contextRecall * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>
          )}

          {/* Cost Breakdown */}
          {metadata.cost && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Cost Breakdown</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Total: ${metadata.cost.total.toFixed(6)}</div>
                <div>Input: {metadata.cost.inputTokens} tokens</div>
                <div>Output: {metadata.cost.outputTokens} tokens</div>
                {metadata.cost.cacheReadTokens && metadata.cost.cacheReadTokens > 0 && (
                  <div>Cache Read: {metadata.cost.cacheReadTokens}</div>
                )}
                {metadata.cost.cacheWriteTokens && metadata.cost.cacheWriteTokens > 0 && (
                  <div>Cache Write: {metadata.cost.cacheWriteTokens}</div>
                )}
                {metadata.cost.rerankingCost && metadata.cost.rerankingCost > 0 && (
                  <div>Reranking: ${metadata.cost.rerankingCost.toFixed(6)}</div>
                )}
              </div>
            </div>
          )}

          {/* Performance Metrics */}
          {metadata.performance && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Performance</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Total: {metadata.performance.totalLatencyMs}ms</div>
                {metadata.performance.ragLatencyMs && (
                  <div>RAG: {metadata.performance.ragLatencyMs}ms</div>
                )}
                <div>Model: {metadata.performance.modelLatencyMs}ms</div>
                {metadata.performance.rerankingLatencyMs && (
                  <div>Rerank: {metadata.performance.rerankingLatencyMs}ms</div>
                )}
              </div>
            </div>
          )}

          {/* Prompt Info */}
          {metadata.prompt && (
            <div className="space-y-1">
              <div className="font-semibold text-foreground">Prompt Engineering</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-muted-foreground">
                <div>Query Type: {metadata.prompt.queryType}</div>
                <div>Grounding: {metadata.prompt.groundingApplied ? 'Yes' : 'No'}</div>
                <div>Citations: {metadata.prompt.citationsRequired ? 'Yes' : 'No'}</div>
                <div>Uncertainty: {metadata.prompt.uncertaintyGuidance ? 'Yes' : 'No'}</div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                  View System Prompt
                </summary>
                <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-foreground/80 max-h-32 overflow-y-auto whitespace-pre-wrap">
                  {metadata.prompt.systemPrompt}
                </div>
              </details>
            </div>
          )}
        </div>
      )}

      {/* User Mode - Simplified View */}
      {!isDeveloperMode && (
        <div className="space-y-3 text-xs">
          <div>
            <div className="text-xs font-semibold mb-2 text-foreground">Response Quality</div>
            <ProgressBar value={calculateHealthScore()} />
          </div>

          {getRecommendations().length > 0 && (
            <div>
              <div className="text-xs font-semibold mb-2 text-foreground">Suggestions</div>
              <div className="space-y-1">
                {getRecommendations().slice(0, 2).map((rec, idx) => (
                  <div key={idx} className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
                    {rec}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
