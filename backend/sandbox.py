import ast
import importlib.util
import logging
import os
import subprocess
import sys
from typing import Dict, List

from dotenv import load_dotenv
from e2b_code_interpreter import Sandbox

load_dotenv()

logger = logging.getLogger(__name__)

E2B_API_KEY = os.getenv("E2B_API_KEY")

DEFAULT_SANDBOX_TIMEOUT_SECONDS = 3500
DEFAULT_EXECUTION_TIMEOUT_SECONDS = 3300
DEFAULT_REQUEST_TIMEOUT_SECONDS = 3350
DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS = 300

PACKAGE_MAP = {
    "sklearn": "scikit-learn",
    "PIL": "Pillow",
    "cv2": "opencv-python",
    "yaml": "PyYAML",
    "bs4": "beautifulsoup4",
    "dateutil": "python-dateutil",
    "skimage": "scikit-image",
    "xgboost": "xgboost",
    "lightgbm": "lightgbm",
    "catboost": "catboost",
    "openpyxl": "openpyxl",
    "xlrd": "xlrd",
    "seaborn": "seaborn",
    "matplotlib": "matplotlib",
    "scipy": "scipy",
    "pandas": "pandas",
    "numpy": "numpy",
    "joblib": "joblib",
    "tqdm": "tqdm",
    "requests": "requests",
    "httpx": "httpx",
    "kaggle": "kaggle",
    "kagglehub": "kagglehub",
    "torch": "torch",
    "torchvision": "torchvision",
    "torchaudio": "torchaudio",
}

TORCH_MODULES = {
    "torch",
    "torchvision",
    "torchaudio",
}

BLOCKED_MODULES = {
    "tensorflow",
    "keras",
    "jax",
    "jaxlib",
}


def _positive_int_env(name: str, default: int) -> int:
    value = os.getenv(name)

    if not value:
        return default

    try:
        parsed = int(value)

        if parsed > 0:
            return parsed

    except ValueError:
        pass

    return default


def _get_imported_modules(python_code: str) -> List[str]:
    """
    Extract top-level imports from generated Python.

    This is intentionally AST-based rather than regex-based so imports such as:

        from sklearn.model_selection import train_test_split

    correctly resolve to sklearn.
    """

    tree = ast.parse(python_code)

    modules = set()

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".")[0]

                if root:
                    modules.add(root)

        elif isinstance(node, ast.ImportFrom):
            if node.module:
                root = node.module.split(".")[0]

                if root:
                    modules.add(root)

    return sorted(modules)


def _module_installed(module_name: str) -> bool:
    try:
        return importlib.util.find_spec(module_name) is not None
    except Exception:
        return False


def _resolve_dependencies(
    python_code: str,
) -> tuple[List[str], List[str]]:
    modules = _get_imported_modules(python_code)

    stdlib = getattr(
        sys,
        "stdlib_module_names",
        set(),
    )

    regular_packages = []
    torch_packages = []

    for module in modules:
        if not module:
            continue

        if module in stdlib:
            continue

        if module in BLOCKED_MODULES:
            raise RuntimeError(
                "Unsupported dependency requested by generated code: "
                f"{module}. "
                "Use a CPU-compatible research implementation instead."
            )

        if _module_installed(module):
            continue

        package = PACKAGE_MAP.get(module, module)

        if module in TORCH_MODULES:
            torch_packages.append(package)
        else:
            regular_packages.append(package)

    return (
        sorted(set(regular_packages)),
        sorted(set(torch_packages)),
    )


def _install_dependencies(
    regular_packages: List[str],
    torch_packages: List[str],
) -> None:
    if not regular_packages and not torch_packages:
        logger.info(
            "All generated-code dependencies are already installed."
        )
        return

    env = os.environ.copy()

    env["PIP_DISABLE_PIP_VERSION_CHECK"] = "1"
    env["PIP_NO_INPUT"] = "1"

    timeout = _positive_int_env(
        "E2B_DEPENDENCY_INSTALL_TIMEOUT_SECONDS",
        DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS,
    )

    base_command = [
        sys.executable,
        "-m",
        "pip",
        "install",
        "--disable-pip-version-check",
        "--no-input",
        "--no-cache-dir",
        "-q",
    ]

    if torch_packages:
        logger.info(
            "Installing missing CPU PyTorch packages: %s",
            torch_packages,
        )

        subprocess.run(
            base_command
            + torch_packages
            + [
                "--index-url",
                "https://download.pytorch.org/whl/cpu",
            ],
            check=True,
            timeout=timeout,
            env=env,
        )

    if regular_packages:
        logger.info(
            "Installing missing Python packages: %s",
            regular_packages,
        )

        subprocess.run(
            base_command + regular_packages,
            check=True,
            timeout=timeout,
            env=env,
        )


def prepare_code_with_auto_install(
    python_code: str,
) -> str:
    """
    Prepare generated code for E2B.

    Only missing imported dependencies are installed.

    PyTorch is installed only when the generated code actually imports
    torch / torchvision / torchaudio.
    """

    try:
        regular_packages, torch_packages = _resolve_dependencies(
            python_code
        )

        if not regular_packages and not torch_packages:
            return python_code

        logger.info(
            "Generated code requires missing dependencies: regular=%s torch=%s",
            regular_packages,
            torch_packages,
        )

        regular_repr = repr(regular_packages)
        torch_repr = repr(torch_packages)

        return f"""
import subprocess
import sys

_regular_packages = {regular_repr}
_torch_packages = {torch_repr}

if _torch_packages:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--no-input",
            "--no-cache-dir",
            "-q",
            *_torch_packages,
            "--index-url",
            "https://download.pytorch.org/whl/cpu",
        ],
        check=True,
        timeout={_positive_int_env(
            "E2B_DEPENDENCY_INSTALL_TIMEOUT_SECONDS",
            DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS,
        )},
    )

if _regular_packages:
    subprocess.run(
        [
            sys.executable,
            "-m",
            "pip",
            "install",
            "--disable-pip-version-check",
            "--no-input",
            "--no-cache-dir",
            "-q",
            *_regular_packages,
        ],
        check=True,
        timeout={_positive_int_env(
            "E2B_DEPENDENCY_INSTALL_TIMEOUT_SECONDS",
            DEFAULT_DEPENDENCY_INSTALL_TIMEOUT_SECONDS,
        )},
    )

{python_code}
""".strip()

    except SyntaxError:
        logger.exception(
            "Generated research code contains invalid Python syntax."
        )
        raise

    except Exception as exc:
        logger.exception(
            "Dependency preparation failed: %s",
            exc,
        )
        raise


def _kaggle_environment() -> Dict[str, str]:
    """
    Forward Kaggle credentials without hardcoding an account.

    KAGGLE_USERNAME is optional and must be supplied by the deployment
    environment if the generated code requires it.
    """

    result = {
        "KAGGLE_API_TOKEN": os.getenv(
            "KAGGLE_API_TOKEN",
            os.getenv("KAGGLE_API_KEY", ""),
        ),
        "KAGGLE_API_KEY": os.getenv(
            "KAGGLE_API_KEY",
            "",
        ),
        "KAGGLE_KEY": os.getenv(
            "KAGGLE_KEY",
            "",
        ),
        "KAGGLE_USERNAME": os.getenv(
            "KAGGLE_USERNAME",
            "",
        ),
    }

    return result


def create_sandbox_session(
    timeout_seconds: int | None = None,
) -> Sandbox:
    """
    Create a persistent E2B sandbox.

    The sandbox lifetime and individual code execution timeout are separate.
    """

    timeout = timeout_seconds or _positive_int_env(
        "E2B_SANDBOX_TIMEOUT_SECONDS",
        DEFAULT_SANDBOX_TIMEOUT_SECONDS,
    )

    logger.info(
        "Creating E2B sandbox with lifetime=%ss",
        timeout,
    )

    return Sandbox.create(
        api_key=E2B_API_KEY,
        timeout=timeout,
        envs=_kaggle_environment(),
    )


def execute_on_sandbox_session(
    sbx: Sandbox,
    python_code: str,
    step_timeout: int | None = None,
) -> dict:
    """
    Execute generated Python inside an existing E2B sandbox.

    The execution timeout is explicit instead of relying on the SDK default.
    """

    timeout = step_timeout or _positive_int_env(
        "E2B_EXECUTION_TIMEOUT_SECONDS",
        DEFAULT_EXECUTION_TIMEOUT_SECONDS,
    )

    request_timeout = max(
        timeout + 30,
        _positive_int_env(
            "E2B_REQUEST_TIMEOUT_SECONDS",
            DEFAULT_REQUEST_TIMEOUT_SECONDS,
        ),
    )

    logger.info(
        "Executing research code in E2B: execution_timeout=%ss request_timeout=%ss",
        timeout,
        request_timeout,
    )

    code_to_run = prepare_code_with_auto_install(
        python_code
    )

    execution = sbx.run_code(
        code_to_run,
        language="python",
        timeout=timeout,
        request_timeout=request_timeout,
    )

    stdout = "\n".join(
        str(value)
        for value in execution.logs.stdout
    )

    stderr = "\n".join(
        str(value)
        for value in execution.logs.stderr
    )

    error_value = None

    if execution.error is not None:
        error_value = getattr(
            execution.error,
            "value",
            None,
        )

        if not error_value:
            error_value = str(
                execution.error
            )

    results = []

    for result in execution.results:
        text = getattr(
            result,
            "text",
            None,
        )

        if text is not None:
            results.append(str(text))
        else:
            results.append(str(result))

    return {
        "success": execution.error is None,
        "stdout": stdout,
        "stderr": stderr,
        "error": error_value,
        "results": results,
    }


def run_code_in_sandbox(
    python_code: str,
    timeout_seconds: int | None = None,
) -> dict:
    """
    Run generated research code in a real E2B sandbox.

    No local execution fallback is used.
    No synthetic metrics are generated.
    """

    api_key = os.getenv("E2B_API_KEY")

    if not api_key:
        return {
            "success": False,
            "stdout": "",
            "stderr": "",
            "error": (
                "E2B_API_KEY is not configured. "
                "A real E2B sandbox is required."
            ),
            "results": [],
        }

    sandbox_timeout = timeout_seconds or _positive_int_env(
        "E2B_SANDBOX_TIMEOUT_SECONDS",
        DEFAULT_SANDBOX_TIMEOUT_SECONDS,
    )

    execution_timeout = min(
        _positive_int_env(
            "E2B_EXECUTION_TIMEOUT_SECONDS",
            DEFAULT_EXECUTION_TIMEOUT_SECONDS,
        ),
        max(30, sandbox_timeout - 60),
    )

    request_timeout = max(
        execution_timeout + 30,
        _positive_int_env(
            "E2B_REQUEST_TIMEOUT_SECONDS",
            DEFAULT_REQUEST_TIMEOUT_SECONDS,
        ),
    )

    sandbox = None

    try:
        logger.info(
            "Provisioning real E2B sandbox: sandbox_timeout=%ss execution_timeout=%ss",
            sandbox_timeout,
            execution_timeout,
        )

        sandbox = Sandbox.create(
            api_key=api_key,
            timeout=sandbox_timeout,
            envs=_kaggle_environment(),
        )

        result = execute_on_sandbox_session(
            sandbox,
            python_code,
            step_timeout=execution_timeout,
        )

        return result

    except Exception as exc:
        logger.exception(
            "E2B sandbox execution failed."
        )

        return {
            "success": False,
            "stdout": "",
            "stderr": str(exc),
            "error": str(exc),
            "results": [],
        }

    finally:
        if sandbox is not None:
            try:
                sandbox.kill()
            except Exception:
                logger.warning(
                    "Failed to cleanly terminate E2B sandbox."
                )
