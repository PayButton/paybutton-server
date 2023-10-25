import subprocess
import json
import matplotlib.pyplot as plt
import csv

def main():
    pass

def write_to_csv(dev_cpu, db_cpu, dev_mem, db_mem):
    with open('docker_stats.csv', mode='a') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow([dev_cpu, db_cpu, dev_mem, db_mem])

def live_plot(dev_cpu_list, db_cpu_list, dev_mem_list, db_mem_list):
    plt.subplot(1, 2, 1)
    plt.plot(dev_cpu_list, label='dev-cpu')
    plt.plot(db_cpu_list, label='db-cpu')
    plt.title('CPU Usage')
    plt.legend()

    plt.subplot(1, 2, 2)
    plt.plot(dev_mem_list, label='dev-mem')
    plt.plot(db_mem_list, label='db-mem')
    plt.title('Memory Usage')
    plt.legend()

    plt.pause(0.1)
    plt.clf()


# clean ANSI escape sequences, breaks, and get dict
def clean_docker_output(s):
    s = s.strip()
    s = json.loads(s[s.index('{'):])
    return s


def read_docker_stats():
    dev_cpu_list = []
    db_cpu_list = []
    dev_mem_list = []
    db_mem_list = []

    # Initialize CSV file
    with open('docker_stats.csv', mode='w') as csv_file:
        writer = csv.writer(csv_file)
        writer.writerow(['dev-cpu', 'db-cpu', 'dev-mem', 'db-mem'])

    # Launch the command as a subprocess that streams the data
    dev_process = subprocess.Popen(['docker', 'stats', 'paybutton-dev', '--format', 'json'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
    db_process = subprocess.Popen(['docker', 'stats', 'paybutton-db', '--format', 'json'], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)

    while True:
        dev_output = dev_process.stdout.readline()
        db_output = db_process.stdout.readline()
        if dev_output == '' and dev_process.poll() is not None:
            break
        if db_output == '' and db_process.poll() is not None:
            break

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

        write_to_csv(dev_cpu, db_cpu, dev_mem, db_mem)
        live_plot(dev_cpu_list, db_cpu_list, dev_mem_list, db_mem_list)


read_docker_stats()
