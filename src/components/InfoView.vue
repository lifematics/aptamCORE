<template>
    <div class="InfoView">

        <h5>Filter Settings:</h5>

        <table class="settings">
            <tr class="row">
                <th>Quality Criteria</th>
                <td>{{this.config.quality_criteria}}</td>
            </tr>
            <tr class="row">
                <th>Max Low Quality Elements</th>
                <td>{{this.config.number_of_low_quality_elements}}</td>
            </tr>
            <tr class="row">
                <th>Length of Variable</th>
                <td>{{this.config.min_variable_length}} - {{this.config.max_variable_length}}</td>
            </tr>
            <tr class="row">
                <th>Head Sequence: Forward Primer (5' to 3')</th>
                <td>{{this.config.head_primer}}</td>
            </tr>
            <tr class="row">
                <th>Maximum Head Sequence Error</th>
                <td>{{this.config.number_of_head_primer_errors}}</td>
            </tr>
            <tr class="row">
                <th>Tail Sequence: Complementary of Reverse Primer (5' to 3')</th>
                <td>{{this.config.tail_primer}}</td>
            </tr>
            <tr class="row">
                <th>Maximum Tail Sequence Error</th>
                <td>{{this.config.number_of_tail_primer_errors}}</td>
            </tr>
        </table>

        <hr/>

        <h5>Clustering Settings:</h5>

        <table class="settings">

            <tr class="row">
                <th>Similarity Criteria</th>
                <td>{{this.config.clustering_criteria}}</td>
            </tr>
            <tr class="row">
                <th>Cluster Size Criteria</th>
                <td>{{this.config.min_cluster_size}}</td>
            </tr>
            <tr class="row">
                <th>Cluster Complementary Sequences</th>
                <td>{{this.config.cluster_complementary_sequences}}</td>
            </tr>
        </table>
        <hr/>


        <h5>Analysis Result</h5>
        <div v-if="info.mergedDataset" id="merger_info_table">
            <table class="settings">
                <tr class="row">
                    <th>Merged Fastq:</th>
                    <td>{{this.info.get_merger_info("merged_file")}}</td>
                </tr>
                <tr class="row">
                    <th>Fastq File1:</th>
                    <td>{{this.info.get_merger_info("source_file1")}}</td>
                </tr>
                <tr class="row">
                    <th>Fastq File2:</th>
                    <td>{{this.info.get_merger_info("source_file2")}}</td>
                </tr>
                <tr class="row">
                    <th>Merged Reads:</th>
                    <td>{{this.info.get_merger_info("num_merged_reads")}}</td>
                </tr>
                <tr class="row">
                    <th>Not Merged Reads (Forward):</th>
                    <td>{{this.info.get_merger_info("num_not_merged_reads1")}}</td>
                </tr>
                <tr class="row">
                    <th>Not Merged Reads (Reverse):</th>
                    <td>{{this.info.get_merger_info("num_not_merged_reads2")}}</td>
                </tr>

            </table>
            <hr/>
        </div>

        <table class="settings">
            <tr class="row">
                <th>Processed Sequences</th>
                <td>{{this.info.processed_sequences}}</td>
            </tr>
            <tr class="row">
                <th>Accepted Sequences</th>
                <td>{{this.info.accepted_sequences}}</td>
            </tr>
            <tr class="row">
                <th>Rejected Sequences</th>
                <td>{{this.info.rejected_sequences}}</td>
            </tr>
            <tr class="row">
                <th>Accepted Clusters</th>
                <td>{{this.info.accepted_clusters}}</td>
            </tr>
            <tr class="row">
                <th>Accepted Cluster Sequences</th>
                <td>{{this.info.accepted_cluster_sequences}}</td>
            </tr>
            <tr class="row">
                <th>Rejected Clusters</th>
                <td>{{this.info.rejected_clusters}}</td>
            </tr>
            <tr class="row">
                <th>Rejected Clusters' Sequences</th>
                <td>{{this.info.rejected_cluster_sequences}}</td>
            </tr>
            <tr class="row">
                <th>Time</th>
                <td>{{(this.info.end_datetime - this.info.begin_datetime) / 1000}} Sec</td>
            </tr>
        </table>

    </div>
</template>

<script>
    export default {
        name: 'ConfigView',
        props: {
            config: Object,
            info: Object,
        },        
    }
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

    div.InfoView {
        margin: 30px;
    }

    h3 {
        margin: 40px 0 0;
    }

    ul {
        list-style-type: none;
        padding: 0;
    }

    li {
        display: inline-block;
        margin: 0 10px;
    }

    a {
        color: #42b983;
    }

    table.settings {
        margin-left: 30px;
    }

    table.settings th {
        text-align: left;
        width: 400px;
    }
</style>
