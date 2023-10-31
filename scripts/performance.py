import subprocess
import json
import matplotlib.pyplot as plt
import csv
from dotenv import load_dotenv
import os
import time

SPEED_TICKS = 40

def main():
    pass

def write_to_csv(dev_cpu, db_cpu, dev_mem, db_mem, speed):
    with open('docker_stats.csv', mode='a') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow([dev_cpu, db_cpu, dev_mem, db_mem, speed])

def live_plot(dev_cpu_list, db_cpu_list, dev_mem_list, db_mem_list, speed_list, save=False):
    plt.subplot(212)
    plt.plot(speed_list, label='speed')
    plt.title('Tx insertions/s')
    plt.legend()

    plt.subplot(222)
    plt.plot(dev_cpu_list, label='dev-cpu')
    plt.plot(db_cpu_list, label='db-cpu')
    plt.title('CPU Usage')
    plt.legend()

    plt.subplot(221)
    plt.plot(dev_mem_list, label='dev-mem')
    plt.plot(db_mem_list, label='db-mem')
    plt.title('Memory Usage')
    plt.legend()

    if save:
        plt.savefig('performance_plot.jpg')

    plt.pause(0.1)
    plt.clf()

# clean ANSI escape sequences, breaks, and get dict
def clean_docker_output(s):
    s = s.strip()
    s = json.loads(s[s.index('{'):])
    return s

def get_speed_command():
    load_dotenv(dotenv_path=".env", override=True)
    load_dotenv(dotenv_path=".env.local", override=True)
    MAIN_DB_USER = os.getenv("MAIN_DB_USER")
    MAIN_DB_PASSWORD = os.getenv("MAIN_DB_PASSWORD")
    MAIN_DB_NAME = os.getenv("MAIN_DB_NAME")
    QUERY = 'SELECT COUNT(*) FROM Transaction;'

    return [
        'docker', 'exec', '-i', 'paybutton-db', 'mariadb',
        '-u', MAIN_DB_USER,
        f'-p{MAIN_DB_PASSWORD}',
        '-D', MAIN_DB_NAME,
        '-e', QUERY,
        '-s', '--skip-column-names'
    ]

def get_speed(insertion_list):
    return (float(insertion_list[-1][0]) - float(insertion_list[0][0])) /  (insertion_list[-1][1] - insertion_list[0][1])

def read_docker_stats():
    dev_cpu_list = []
    db_cpu_list = []
    dev_mem_list = []
    db_mem_list = []
    insertion_speed_list = []

    # Initialize CSV file
    #with open('docker_stats.csv', mode='w') as csv_file:
        #writer = csv.writer(csv_file)
        #writer.writerow(['dev-cpu', 'db-cpu', 'dev-mem', 'db-mem'])

    # Launch the command as a subprocess that streams the data
    dev_process = subprocess.Popen(['docker', 'stats', 'paybutton-dev', '--format', 'json'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    db_process = subprocess.Popen(['docker', 'stats', 'paybutton-db', '--format', 'json'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    speed_command = get_speed_command()

    last_speed_ticks = [(0, 0)] * SPEED_TICKS
    while True:
        dev_output = dev_process.stdout.readline()
        db_output = db_process.stdout.readline()
        insertion_speed = subprocess.Popen(speed_command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        insertion_time = time.time()
        speed_output = insertion_speed.stdout.readline()
        if dev_output == '' and dev_process.poll() is not None:
            break
        if db_output == '' and db_process.poll() is not None:
            break

        last_speed_ticks.pop(0)
        last_speed_ticks.append((speed_output, insertion_time))
        speed = get_speed(last_speed_ticks)

        dev_stats = clean_docker_output(dev_output)
        db_stats = clean_docker_output(db_output)

        dev_cpu = dev_stats['CPUPerc']
        db_cpu = db_stats['CPUPerc']
        dev_mem = dev_stats['MemPerc']
        db_mem = db_stats['MemPerc']

        dev_cpu_list.append(float(dev_cpu.strip('%')))
        db_cpu_list.append(float(db_cpu.strip('%')))
        dev_mem_list.append(float(dev_mem.strip('%')))
        db_mem_list.append(float(db_mem.strip('%')))
        insertion_speed_list.append(speed)

        #write_to_csv(dev_cpu, db_cpu, dev_mem, db_mem, speed)
        live_plot(dev_cpu_list, db_cpu_list, dev_mem_list, db_mem_list, insertion_speed_list, save=True)


read_docker_stats()
