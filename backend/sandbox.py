import os
import logging
from e2b_code_interpreter import Sandbox
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

E2B_API_KEY = os.getenv("E2B_API_KEY")

def prepare_code_with_auto_install(python_code: str) -> str:
    """Parses AST and prepends auto-install block for missing dependencies."""
    import ast
    import sys
    try:
        tree = ast.parse(python_code)
        imports = set()
        for node in ast.walk(tree):
            if isinstance(node, ast.Import):
                for alias in node.names:
                    imports.add(alias.name.split('.')[0])
            elif isinstance(node, ast.ImportFrom):
                if node.module:
                    imports.add(node.module.split('.')[0])
        
        # Filter standard library
        stdlib = getattr(sys, 'stdlib_module_names', set())
        third_party = [mod for mod in imports if mod not in stdlib and mod != '']
        
        PACKAGE_MAP = {
            'sklearn': 'scikit-learn',
            'PIL': 'Pillow',
            'cv2': 'opencv-python',
        }
        BLOCKED_PACKAGES = {'tensorflow', 'keras', 'jax', 'jaxlib'}
        TORCH_PACKAGES = {'torch', 'torchvision', 'torchaudio'}
        
        pip_packages = []
        torch_packages = []
        for mod in third_party:
            if mod in BLOCKED_PACKAGES:
                logger.warning(f"Skipping blocked package '{mod}' (too large for sandbox)")
                continue
            if mod in TORCH_PACKAGES:
                torch_packages.append(mod)
                continue
            pip_packages.append(PACKAGE_MAP.get(mod, mod))
        
        install_block = ""
        if torch_packages:
            logger.info(f"Auto-installing PyTorch CPU packages: {torch_packages}")
            torch_str = ", ".join(repr(m) for m in torch_packages)
            install_block += f"import subprocess, sys\nsubprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--no-cache-dir', {torch_str}, '--index-url', 'https://download.pytorch.org/whl/cpu'])\n\n"
        
        if pip_packages:
            logger.info(f"Auto-installing dependencies: {pip_packages}")
            packages_str = ", ".join(repr(m) for m in pip_packages)
            install_block += f"import subprocess, sys\nsubprocess.run([sys.executable, '-m', 'pip', 'install', '-q', '--no-cache-dir', {packages_str}])\n\n"
        
        if install_block:
            return install_block + python_code
    except Exception as parse_e:
        logger.warning(f"Auto-install failed: {parse_e}")
    return python_code

def create_sandbox_session(timeout_seconds: int = 900) -> Sandbox:
    """Creates a new disposable E2B sandbox session that stays alive across multiple code steps."""
    logger.info("Provisioning persistent E2B Sandbox...")
    return Sandbox.create(
        timeout=timeout_seconds,
        envs={"KAGGLE_API_TOKEN": os.getenv("KAGGLE_API_TOKEN", os.getenv("KAGGLE_API_KEY", ""))}
    )

def execute_on_sandbox_session(sbx: Sandbox, python_code: str, step_timeout: int = 850) -> dict:
    """
    Executes code on an existing sandbox session without killing it.

    NOTE: E2B's run_code() has its OWN execution timeout, separate from the
    sandbox session's wall-clock lifetime (the 900s passed to Sandbox.create()).
    The run_code default is only ~60s, which is why real PyTorch training /
    data-processing steps were getting killed with "Execution timed out" even
    though the session itself had 800+ seconds left. We now pass an explicit
    step_timeout so a single code execution can use most of the session's
    wall clock, leaving a small safety margin for sandbox teardown/logging.
    """
    code_to_run = prepare_code_with_auto_install(python_code)
    logger.info(f"Executing code step in sandbox session (timeout={step_timeout}s)...")
    execution = sbx.run_code(code_to_run, timeout=step_timeout)
    stdout = "\n".join(execution.logs.stdout)
    stderr = "\n".join(execution.logs.stderr)
    return {
        "success": execution.error is None,
        "stdout": stdout,
        "stderr": stderr,
        "error": getattr(execution.error, 'value', str(execution.error)) if execution.error else None,
        "results": [result.text for result in execution.results]
    }

def run_code_in_sandbox(python_code: str, timeout_seconds: int = 900) -> dict:
    """
    Executes Python code in a secure real E2B cloud sandbox session using E2B_API_KEY.
    Returns stdout, stderr, and execution status.
    """
    api_key = os.getenv("E2B_API_KEY")
    if not api_key:
        raise ValueError("E2B_API_KEY is not configured in .env file. E2B cloud sandbox is required.")

    sbx = None
    try:
        logger.info("Creating real E2B cloud sandbox instance...")
        sbx = Sandbox.create(
            api_key=api_key,
            timeout=timeout_seconds,
            envs={"KAGGLE_API_TOKEN": os.getenv("KAGGLE_API_TOKEN", os.getenv("KAGGLE_API_KEY", ""))}
        )
        # Leave a small safety margin under the session timeout for
        # sandbox teardown / result-collection to complete.
        step_timeout = max(30, timeout_seconds - 50)
        res = execute_on_sandbox_session(sbx, python_code, step_timeout=step_timeout)
        return res
    except Exception as e:
        logger.error(f"E2B Cloud Sandbox execution failed: {e}")
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "error": str(e),
            "results": []
        }
    finally:
        if sbx:
            try:
                sbx.kill()
            except Exception:
                pass
