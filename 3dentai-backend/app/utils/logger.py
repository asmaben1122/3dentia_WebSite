import logging
import sys
from pathlib import Path

# Setup paths
LOG_DIR = Path(__file__).resolve().parent.parent.parent / "logs"
LOG_DIR.mkdir(exist_ok=True)
LOG_FILE = LOG_DIR / "backend.log"

def setup_logger(name: str = "3DentAI") -> logging.Logger:
    """Configures a professional logging format logging to both stdout and a rolling file."""
    logger = logging.getLogger(name)
    
    # Avoid duplicate handlers if logger is already configured
    if logger.handlers:
        return logger
        
    logger.setLevel(logging.INFO)
    
    # Beautiful logging layout
    formatter = logging.Formatter(
        "[%(asctime)s] %(levelname)-8s %(name)s - [%(filename)s:%(lineno)d] - %(message)s"
    )
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)
    
    # File handler
    try:
        file_handler = logging.FileHandler(LOG_FILE, encoding="utf-8")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create file logger: {e}", file=sys.stderr)
        
    return logger

logger = setup_logger()
