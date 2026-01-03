import React, { useState } from 'react';
import axios from 'axios';
import Plot from 'react-plotly.js';

function EmbeddingPlot({ data }) {
  if (!data || data.length === 0) return null;

  return (
    <div style={{ marginTop: '40px' }}>
      <Plot
        data={[
          {
            x: data.map(p => p.x),
            y: data.map(p => p.y),
            text: data.map(p => p.word),
            mode: 'lines+markers',
            type: 'scatter',
            marker: {
              size: 10,
              color: data.map((_, i) => i),
              colorscale: 'Viridis'
            },
            line: {
              width: 2
            }
          }
        ]}
        layout={{
          title: 'Semantic Navigation Path',
          paper_bgcolor: '#0f172a',
          plot_bgcolor: '#0f172a',
          font: { color: '#f8fafc' },
          xaxis: {
            title: 'PC1',
            zeroline: false,
            gridcolor: '#334155'
          },
          yaxis: {
            title: 'PC2',
            zeroline: false,
            gridcolor: '#334155'
          },
          margin: { t: 50, l: 50, r: 20, b: 50 },
          autosize: true
        }}
        style={{ width: '100%', height: '450px' }}
        useResizeHandler
        config={{ displayModeBar: false }}
      />
    </div>
  );
}

function App() {
  const [startSlug, setStartSlug] = useState('');
  const [targetTitle, setTargetTitle] = useState('');
  const [gameState, setGameState] = useState('SETUP'); 
  const [history, setHistory] = useState([]); 
  const [currentData, setCurrentData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

    const formatSlug = (txt) => txt.trim().replace(/\s+/g, '_');

  const startGame = async () => {
    if (!startSlug || !targetTitle) return;

    setGameState('PLAYING');
    setHistory([]);
    setCurrentData(null);
    setError('');

    await fetchNextStep(formatSlug(startSlug));
  };

  const fetchNextStep = async (slug) => {
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.post(
        'http://127.0.0.1:5000/api/step',
        {
          current: slug,
          target: targetTitle
        }
      );

      if (response.data.error) {
        setError(response.data.error);
        setLoading(false);
        return;
      }

      const pageTitle = response.data.current_title;

      setHistory(prev => [...prev, pageTitle]);
      setCurrentData(response.data);

      // ✅ Backend decides when game ends
      if (response.data.done === true) {
        setGameState('WON');
        setLoading(false);
        return;
      }

    } catch (err) {
      setError('Failed to connect to the AI engine.');
    }

    setLoading(false);
  };

  // ✅ Always call backend — no frontend win logic
  const handleLinkClick = (slug) => {
    if (loading || gameState !== 'PLAYING') return;
    fetchNextStep(slug);
  };

  const getScoreColor = (score) => {
    if (score > 0.7) return '#10b981';
    if (score > 0.4) return '#f59e0b';
    return '#64748b';
  };

  const resetGame = () => {
    setGameState('SETUP');
    setStartSlug('');
    setTargetTitle('');
    setHistory([]);
    setCurrentData(null);
    setError('');
  };

  return (
    <div style={styles.pageBackground}>
      {/* Sidebar */}
      <aside style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <div style={styles.logo}>WR</div>
          <h1 style={styles.sidebarTitle}>Wiki<span style={styles.accent}>Run</span></h1>
          <p style={styles.sidebarSubtitle}>AI Navigation Game</p>
        </div>
        
        <div style={styles.sidebarContent}>
          <div style={styles.statsCard}>
            <h3 style={styles.statsTitle}>Current Run</h3>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Steps Taken:</span>
              <span style={styles.statValue}>{history.length}</span>
            </div>
            <div style={styles.statRow}>
              <span style={styles.statLabel}>Status:</span>
              <span style={{
                ...styles.statValue,
                color: gameState === 'WON' ? '#10b981' : gameState === 'PLAYING' ? '#3b82f6' : '#64748b'
              }}>
                {gameState === 'WON' ? 'Complete!' : gameState === 'PLAYING' ? 'In Progress' : 'Not Started'}
              </span>
            </div>
          </div>

          <div style={styles.instructions}>
            <h4 style={styles.instructionsTitle}>How to Play</h4>
            <ul style={styles.instructionsList}>
              <li>Set start & target pages</li>
              <li>Embedding Al relevant links</li>
              <li>Choose highest similarity</li>
              <li>Reach target in minimal steps</li>
            </ul>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={styles.mainContent}>
        <header style={styles.mainHeader}>
          <div style={styles.headerLeft}>
            <h2 style={styles.pageTitle}>
              {gameState === 'SETUP' ? 'Start New Game' : 
               gameState === 'PLAYING' ? 'Navigation in Progress' : 'Mission Accomplished!'}
            </h2>
            <p style={styles.pageSubtitle}>
              {gameState === 'SETUP' ? 'Configure your Wikipedia speedrun challenge' :
               gameState === 'PLAYING' ? 'Navigate through semantic connections' : 
               `Reached target in ${history.length - 1} steps!`}
            </p>
          </div>
          {gameState !== 'SETUP' && (
            <button style={styles.resetButton} onClick={resetGame}>
              New Game
            </button>
          )}
        </header>

        {/* Setup Screen */}
        {gameState === 'SETUP' && (
          <div style={styles.setupContainer}>
            <div style={styles.setupCard}>
              <div style={styles.inputSection}>
                <div style={styles.inputWrapper}>
                  <label style={styles.inputLabel}>Starting Point</label>
                  <input 
                    style={styles.input}
                    placeholder="e.g., Quantum Mechanics, Machine Learning, Ancient Rome"
                    value={startSlug}
                    onChange={(e) => setStartSlug(e.target.value)}
                  />
                  <p style={styles.inputHint}>Any Wikipedia article to begin from</p>
                </div>
                
                <div style={styles.separator}>
                  <div style={styles.separatorLine}></div>
                  <div style={styles.separatorIcon}>→</div>
                  <div style={styles.separatorLine}></div>
                </div>

                <div style={styles.inputWrapper}>
                  <label style={styles.inputLabel}>Target Destination</label>
                  <input 
                    style={styles.input}
                    placeholder="e.g., French Fries, Artificial Intelligence, Napoleon"
                    value={targetTitle}
                    onChange={(e) => setTargetTitle(e.target.value)}
                  />
                  <p style={styles.inputHint}>The Wikipedia article you need to reach</p>
                </div>
              </div>

              <button 
                style={styles.startButton}
                onClick={startGame}
                disabled={!startSlug || !targetTitle}
              >
                <span style={styles.startButtonText}>Analyse Semantics</span>
                <span style={styles.startButtonIcon}>🚀</span>
              </button>
            </div>
          </div>
        )}

        {/* Game Screen */}
        {(gameState === 'PLAYING' || gameState === 'WON') && (
          <div style={styles.gameContainer}>
            {/* Progress Header */}
            <div style={styles.progressHeader}>
              <div style={styles.progressInfo}>
                <span style={styles.progressLabel}>Current Target:</span>
                <span style={styles.targetDisplay}>{targetTitle}</span>
              </div>
              <div style={styles.stepCounter}>
                <span style={styles.stepLabel}>Step {history.length}</span>
                <span style={styles.stepTotal}>• {history.length - 1} taken</span>
              </div>
            </div>

            {/* History Path */}
            {history.length > 0 && (
              <div style={styles.historyPath}>
                <div style={styles.historyLabel}>Navigation Path:</div>
                <div style={styles.pathSteps}>
                  {history.map((step, index) => (
                    <React.Fragment key={index}>
                      <div style={styles.pathStep}>
                        <div style={styles.stepNumber}>{index + 1}</div>
                        <div style={styles.stepTitle}>{step}</div>
                      </div>
                      {index < history.length - 1 && (
                        <div style={styles.pathArrow}>→</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              </div>
            )}

            {/* Main Game Area */}
            {gameState === 'WON' ? (
              <div style={styles.winScreen}>
                <div style={styles.winIcon}>🏆</div>
                <h2 style={styles.winTitle}>Target Reached!</h2>
                <p style={styles.winMessage}>
                  Successfully navigated from <strong>{history[0]}</strong> to <strong>{targetTitle}</strong><br />
                  in <span style={styles.winHighlight}>{history.length - 1}</span> semantic leaps.
                </p>
                <div style={styles.winActions}>
                  <button style={styles.winButton} onClick={resetGame}>
                    Play Again
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.gameArea}>
                {loading ? (
                  <div style={styles.loadingState}>
                    <div style={styles.spinner}></div>
                    <div style={styles.loadingText}>
                      <div>AI analyzing semantic connections...</div>
                      <div style={styles.loadingSubtext}>Calculating relevance scores</div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Current Page */}
                    <div style={styles.currentPage}>
                      <div style={styles.currentPageHeader}>
                        <span style={styles.currentPageLabel}>Current Page</span>
                        <span style={styles.currentPageHint}>Select the most relevant link below</span>
                      </div>
                      <h1 style={styles.currentPageTitle}>
                        📍 {currentData?.current_title}
                      </h1>
                    </div>

                    {/* Links Grid */}
                    <div style={styles.linksContainer}>
                      <h3 style={styles.linksTitle}>Available Links (Ranked by Relevance)</h3>
                      {error && <div style={styles.error}>{error}</div>}
                      
                      <div style={styles.linksGrid}>
                        {currentData?.links.map((link, index) => (
                          <div 
                            key={index}
                            style={styles.linkCard}
                            onClick={() => handleLinkClick(link.slug, link.title)}
                          >
                            <div style={styles.linkHeader}>
                              <div style={styles.linkRank}>#{index + 1}</div>
                              <h4 style={styles.linkTitle}>{link.title}</h4>
                            </div>
                            
                            <div style={styles.linkInfo}>
                              <div style={styles.relevanceSection}>
                                <div style={styles.relevanceHeader}>
                                  <span style={styles.relevanceLabel}>Semantic Match</span>
                                  <span style={styles.relevanceScore}>
                                    {(link.score * 100).toFixed(1)}%
                                  </span>
                                </div>
                                <div style={styles.scoreBarContainer}>
                                  <div 
                                    style={{
                                      ...styles.scoreBar,
                                      width: `${link.score * 100}%`,
                                      backgroundColor: getScoreColor(link.score)
                                    }}
                                  />
                                </div>
                                <div style={styles.scoreLabels}>
                                  <span>Low</span>
                                  <span>High</span>
                                </div>
                              </div>
                              
                              <div style={styles.actionButton}>
                                Select Link →
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const styles = {
  pageBackground: {
    minHeight: '100vh',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    display: 'flex',
  },
  
  // Sidebar Styles
  sidebar: {
    width: '280px',
    backgroundColor: '#1e293b',
    borderRight: '1px solid #334155',
    display: 'flex',
    flexDirection: 'column',
    flexShrink: 0,
  },
  sidebarHeader: {
    padding: '30px 25px',
    borderBottom: '1px solid #334155',
  },
  logo: {
    width: '40px',
    height: '40px',
    backgroundColor: '#3b82f6',
    borderRadius: '10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
  },
  sidebarTitle: {
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 0 5px 0',
  },
  accent: {
    color: '#3b82f6',
  },
  sidebarSubtitle: {
    color: '#94a3b8',
    fontSize: '14px',
    margin: 0,
  },
  sidebarContent: {
    padding: '25px',
    flexGrow: 1,
  },
  statsCard: {
    backgroundColor: '#0f172a',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '25px',
  },
  statsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 15px 0',
    color: '#e2e8f0',
  },
  statRow: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '12px',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  statValue: {
    color: '#f1f5f9',
    fontWeight: '600',
    fontSize: '14px',
  },
  instructions: {
    marginTop: '30px',
  },
  instructionsTitle: {
    fontSize: '16px',
    fontWeight: '600',
    margin: '0 0 15px 0',
    color: '#e2e8f0',
  },
  instructionsList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  instructionsList: {
    margin: 0,
    padding: 0,
    listStyle: 'none',
  },
  
  // Main Content Styles
  mainContent: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    padding: '30px 40px',
    overflow: 'auto',
    maxWidth: 'calc(100vw - 280px)',
  },
  mainHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '40px',
    paddingBottom: '20px',
    borderBottom: '1px solid #334155',
  },
  headerLeft: {
    flexGrow: 1,
  },
  pageTitle: {
    fontSize: '32px',
    fontWeight: '800',
    margin: '0 0 10px 0',
    color: '#f1f5f9',
  },
  pageSubtitle: {
    fontSize: '18px',
    color: '#94a3b8',
    margin: 0,
  },
  resetButton: {
    padding: '10px 20px',
    backgroundColor: '#334155',
    color: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    fontWeight: '600',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
  },
  
  // Setup Screen
  setupContainer: {
    flexGrow: 1,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 0',
  },
  setupCard: {
    width: '100%',
    maxWidth: '800px',
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '50px',
    border: '1px solid #334155',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
  inputSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '40px',
    marginBottom: '50px',
  },
  inputWrapper: {
    flex: 1,
  },
  inputLabel: {
    display: 'block',
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    marginBottom: '12px',
  },
  input: {
    width: '100%',
    padding: '18px 20px',
    backgroundColor: '#0f172a',
    border: '2px solid #334155',
    borderRadius: '12px',
    color: '#f1f5f9',
    fontSize: '18px',
    outline: 'none',
    transition: 'border-color 0.2s ease',
  },
  inputHint: {
    fontSize: '14px',
    color: '#64748b',
    marginTop: '8px',
    marginLeft: '5px',
  },
  separator: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  separatorLine: {
    width: '40px',
    height: '2px',
    backgroundColor: '#334155',
  },
  separatorIcon: {
    color: '#3b82f6',
    fontSize: '20px',
  },
  startButton: {
    width: '100%',
    padding: '22px 30px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontWeight: '700',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    transition: 'all 0.2s ease',
  },
  startButtonText: {
    fontSize: '18px',
  },
  startButtonIcon: {
    fontSize: '24px',
  },
  
  // Game Container
  gameContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  progressHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    border: '1px solid #334155',
  },
  progressInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  progressLabel: {
    color: '#94a3b8',
    fontSize: '14px',
  },
  targetDisplay: {
    fontSize: '20px',
    fontWeight: '700',
    color: '#3b82f6',
  },
  stepCounter: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },
  stepLabel: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#f1f5f9',
  },
  stepTotal: {
    color: '#64748b',
    fontSize: '14px',
  },
  
  // History Path
  historyPath: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '25px',
    border: '1px solid #334155',
  },
  historyLabel: {
    color: '#94a3b8',
    fontSize: '14px',
    marginBottom: '15px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  pathSteps: {
    display: 'flex',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: '15px',
  },
  pathStep: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 20px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
  },
  stepNumber: {
    width: '28px',
    height: '28px',
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '600',
  },
  stepTitle: {
    fontSize: '16px',
    fontWeight: '500',
  },
  pathArrow: {
    color: '#64748b',
    fontSize: '20px',
  },
  
  // Game Area
  gameArea: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '30px',
  },
  
  // Loading State
  loadingState: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '25px',
  },
  spinner: {
    width: '60px',
    height: '60px',
    border: '4px solid #1e293b',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    textAlign: 'center',
  },
  loadingSubtext: {
    color: '#94a3b8',
    fontSize: '14px',
    marginTop: '5px',
  },
  
  // Current Page
  currentPage: {
    backgroundColor: '#1e293b',
    borderRadius: '16px',
    padding: '30px',
    border: '2px solid #334155',
  },
  currentPageHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
  },
  currentPageLabel: {
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
  currentPageHint: {
    color: '#64748b',
    fontSize: '14px',
  },
  currentPageTitle: {
    fontSize: '32px',
    fontWeight: '800',
    margin: 0,
    color: '#f1f5f9',
  },
  
  // Links Container
  linksContainer: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  linksTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#e2e8f0',
    margin: 0,
  },
  linksGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '25px',
    flexGrow: 1,
  },
  
  // Link Card
  linkCard: {
    backgroundColor: '#1e293b',
    borderRadius: '12px',
    padding: '25px',
    border: '1px solid #334155',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  linkHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '15px',
  },
  linkRank: {
    width: '36px',
    height: '36px',
    backgroundColor: '#0f172a',
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: '700',
    color: '#94a3b8',
  },
  linkTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#f1f5f9',
    margin: 0,
    flexGrow: 1,
  },
  linkInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  relevanceSection: {},
  relevanceHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '8px',
  },
  relevanceLabel: {
    color: '#94a3b8',
    fontSize: '13px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  relevanceScore: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#f1f5f9',
  },
  scoreBarContainer: {
    height: '8px',
    backgroundColor: '#0f172a',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '6px',
  },
  scoreBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  scoreLabels: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '11px',
    color: '#64748b',
  },
  actionButton: {
    padding: '12px',
    backgroundColor: '#334155',
    color: '#f1f5f9',
    borderRadius: '8px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
  },
  
  // Win Screen
  winScreen: {
    flexGrow: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 40px',
    textAlign: 'center',
  },
  winIcon: {
    fontSize: '80px',
    marginBottom: '30px',
  },
  winTitle: {
    fontSize: '42px',
    fontWeight: '800',
    color: '#f1f5f9',
    margin: '0 0 20px 0',
  },
  winMessage: {
    fontSize: '20px',
    color: '#94a3b8',
    lineHeight: '1.6',
    margin: '0 0 40px 0',
    maxWidth: '600px',
  },
  winHighlight: {
    color: '#10b981',
    fontWeight: '800',
    fontSize: '28px',
  },
  winActions: {
    display: 'flex',
    gap: '20px',
  },
  winButton: {
    padding: '18px 35px',
    backgroundColor: '#3b82f6',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '18px',
    fontWeight: '700',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  
  // Error
  error: {
    backgroundColor: '#7f1d1d',
    color: '#fca5a5',
    padding: '15px 20px',
    borderRadius: '8px',
    fontSize: '14px',
    marginBottom: '20px',
  },
};

// Add keyframes for spinner
const styleSheet = document.styleSheets[0];
styleSheet.insertRule(`
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`, styleSheet.cssRules.length);

export default App;