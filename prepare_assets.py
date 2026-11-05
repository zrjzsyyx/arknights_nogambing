"""Compatibility entrypoint. Current pool synchronization lives in sync_current.py."""
import runpy,pathlib
runpy.run_path(str(pathlib.Path(__file__).with_name('sync_current.py')),run_name='__main__')
